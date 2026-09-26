import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { fetchStateNetwork } from '@/features/connectivity/services';
import { fetchDepartmentBudget } from '@/features/governance/services';
import { AreaIndicatorsSchema } from '@/features/indicators/schemas';
import { fetchAllIndicators } from '@/features/indicators/services';
import { fetchPilgrimArrivals } from '@/features/tourism/services';
import { fetchBusinessSchemes } from '@/features/business/services';
import { fetchRoadClosures } from '@/features/roads/services';
import { closureCounts } from '@/features/roads/closures';
import type {
  DistrictSummary,
  ImdCapLiveStatus,
  LiveCounters,
  StateFigure,
  StateOverview,
} from '../types';
import {
  AlertSummarySchema,
  DistrictSummarySchema,
  ImdCapLiveStatusSchema,
  PopulationRankingSchema,
} from '../schemas';

export async function fetchImdCapLiveStatus(): Promise<ImdCapLiveStatus> {
  // No longer `no-store`: one uncached fetch makes the whole home page render on every
  // request, and this is a connection-health badge whose value does not change faster than
  // the page's own two-minute window. The freshness it reports is `checkedAt`, which is
  // shown, so a slightly older check is visible rather than misleading.
  return apiClient.get('/sources/imd-cap-alerts/live', ImdCapLiveStatusSchema);
}

export async function fetchLiveCounters(): Promise<LiveCounters> {
  const [alerts, tourism, network, budget, indicators, schemes, roads] = await Promise.all([
    apiClient.get('/alerts/summary', AlertSummarySchema).catch(() => null),
    fetchPilgrimArrivals().catch(() => null),
    fetchStateNetwork().catch(() => null),
    fetchDepartmentBudget().catch(() => null),
    fetchAllIndicators().catch(() => null),
    fetchBusinessSchemes({ limit: 1 }).catch(() => null),
    fetchRoadClosures().catch(() => null),
  ]);
  const roadCounts = roads?.available ? closureCounts(roads) : null;

  // The latest year can be an in-progress pilgrimage season. The homepage must not turn a
  // partial annual total into a claim about how many people are physically in the state now.
  const currentYear = new Date().getUTCFullYear();
  const completedTourismYear = tourism?.totals
    .filter((entry) => entry.year < currentYear)
    .sort((a, b) => b.year - a.year)[0];
  const destinationCount =
    completedTourismYear === undefined
      ? 0
      : (tourism?.destinations.filter((destination) =>
          destination.years.some((entry) => entry.year === completedTourismYear.year)
        ).length ?? 0);
  const mobile = network?.spread.find((entry) => entry.kind === 'mobile');
  const categories = new Set((indicators ?? []).map((indicator) => indicator.category));

  return {
    pilgrimArrivals: {
      value: completedTourismYear?.visitors ?? null,
      year: completedTourismYear?.year ?? null,
      destinationCount,
    },
    activeAlerts: alerts?.activeCount ?? null,
    connectivity: {
      mobileDownloadMbps: mobile?.stateAverageMbps ?? null,
      districtsMeasured: mobile?.districtsMeasured ?? 0,
      quarterStart: network?.quarterStart ?? null,
    },
    budget: {
      total: budget?.summary?.totalExpenditure ?? null,
      fiscalYear: budget?.fiscalYear ?? null,
      yearsAvailable: budget?.history.length ?? 0,
    },
    indicatorCatalogue: {
      indicatorCount: indicators?.length ?? 0,
      categoryCount: categories.size,
    },
    startupSchemes: {
      verifiedCount: schemes?.total ?? 0,
      verifiedOn: schemes?.verifiedOn ?? null,
    },
    roadClosures: {
      available: roadCounts !== null,
      unavailableReason:
        roads === null ? 'unreachable' : roads.available ? null : roads.unavailableReason,
      closed: roadCounts?.closed ?? 0,
      highways: roadCounts?.highways ?? 0,
      reopened: roadCounts?.reopened ?? 0,
      checkedAt: roads?.checkedAt ?? null,
    },
  };
}

/**
 * The state profile figures.
 *
 * These were six hardcoded literals in this function until the `indicators` module gained
 * state-scoped rows (migrations 024-026). Two of them were wrong: the village count matched
 * no published Census total, and "63% forest coverage" matched neither of the Forest Survey
 * of India's two measures. Both rendered beside genuine Census figures and looked equally
 * authoritative, which is the failure this module's provenance rules exist to prevent.
 *
 * They now come from the API with a source and a vintage attached. Nothing is defaulted: a
 * figure the API does not return arrives as null and the panel shows a dash, because an
 * invented number is worse than an absent one.
 */
export async function fetchStateOverview(): Promise<StateOverview> {
  const [districts, indicators] = await Promise.all([
    apiClient.get('/areas/districts', z.array(DistrictSummarySchema)),
    // Degrades to "no figures" rather than failing the whole dashboard — the map, alerts
    // and district grid do not depend on this panel.
    apiClient.get('/areas/uttarakhand/indicators', AreaIndicatorsSchema).catch(() => null),
  ]);

  const byKey = new Map((indicators?.values ?? []).map((entry) => [entry.indicator.key, entry]));

  const figure = (key: string, note: string | null = null): StateFigure => {
    const entry = byKey.get(key);
    if (entry === undefined) {
      return { value: null, vintage: null, sourceLabel: null, sourceUrl: null, note };
    }
    return {
      value: entry.value,
      vintage: entry.vintage,
      sourceLabel: entry.provenance?.department?.en ?? entry.provenance?.sourceKey ?? null,
      sourceUrl: entry.provenance?.url ?? null,
      note,
    };
  };

  return {
    population: figure(
      'state_population_projection',
      'Official projection based on Census 2011—not a new Census headcount.'
    ),
    areaKmSq: figure('state_area_sq_km'),
    literacy: figure('state_literacy_plfs', 'PLFS sample-survey estimate for people aged 7+.'),
    // Counted, not stored: the district list is the authority on how many districts there
    // are, so a second copy of "13" could only ever disagree with it.
    districts: {
      value: districts.length,
      vintage: null,
      sourceLabel: 'Pahad Pulse geography module',
      sourceUrl: null,
      note: 'Counted from the current district directory.',
    },
    forestCoverage: figure('state_forest_cover_pct'),
    villages: figure(
      'state_administrative_villages',
      'Unique village codes in the current LGD directory; map-boundary coverage is separate.'
    ),
  };
}

/**
 * The 13 districts with their populations and active-alert counts.
 *
 * Population comes from the indicator ranking rather than being hard-coded: one request
 * returns every district's latest figure with its vintage and source, so the number on the
 * card is the same Census 2011 value the district page cites, not a second copy that can
 * drift. Both figures previously read 0 because nothing fetched them.
 */
export async function fetchAllDistricts(): Promise<DistrictSummary[]> {
  const [areas, populations, alertSummaries] = await Promise.all([
    apiClient.get('/areas/districts', z.array(DistrictSummarySchema)),
    apiClient.get('/indicators/population/ranking', PopulationRankingSchema).catch(() => null),
    apiClient
      .get('/alerts/active', z.array(z.object({ areas: z.array(z.object({ slug: z.string() })) })))
      .catch(() => null),
  ]);

  const populationBySlug = new Map(
    (populations?.entries ?? []).map((entry) => [entry.area.slug, entry.value])
  );

  // An alert names every district it covers, so one warning over nine districts counts once
  // for each of them — which is what a per-district badge should say.
  const alertsBySlug = new Map<string, number>();
  for (const alert of alertSummaries ?? []) {
    for (const area of alert.areas) {
      alertsBySlug.set(area.slug, (alertsBySlug.get(area.slug) ?? 0) + 1);
    }
  }

  return areas.map((area) => ({
    id: area.id,
    name: area.name.en,
    nameHi: area.name.hi,
    population: populationBySlug.get(area.slug) ?? 0,
    populationVintage: populations?.vintage ?? null,
    activeAlerts: alertsBySlug.get(area.slug) ?? 0,
    slug: area.slug,
  }));
}
