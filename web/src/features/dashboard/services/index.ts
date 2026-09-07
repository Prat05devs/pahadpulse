import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { AreaIndicatorsSchema } from '@/features/indicators/schemas';
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
  const alerts = await apiClient.get('/alerts/summary', AlertSummarySchema);

  const closedRoads = 0; // TODO: fetch from roads API when available
  const touristsInState = 0; // TODO: fetch from tourism API when available
  const connectivityPercentage = 0; // TODO: fetch from connectivity API when available

  return {
    touristsInState,
    activeAlerts: alerts.activeCount,
    closedRoads,
    connectivityPercentage,
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

  const byKey = new Map((indicators ?? []).map((entry) => [entry.indicator.key, entry]));

  const figure = (key: string): StateFigure => {
    const entry = byKey.get(key);
    if (entry === undefined) return { value: null, vintage: null, sourceLabel: null };
    return {
      value: entry.value,
      vintage: entry.vintage,
      sourceLabel: entry.provenance?.department?.en ?? entry.provenance?.sourceKey ?? null,
    };
  };

  return {
    population: figure('state_population'),
    areaKmSq: figure('state_area_sq_km'),
    literacy: figure('state_literacy_rate'),
    // Counted, not stored: the district list is the authority on how many districts there
    // are, so a second copy of "13" could only ever disagree with it.
    districts: {
      value: districts.length,
      vintage: null,
      sourceLabel: 'Pahad Pulse geography module',
    },
    forestCoverage: figure('state_forest_cover_pct'),
    villages: figure('state_villages'),
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
    apiClient.get('/alerts/active', z.array(z.object({ areas: z.array(z.object({ slug: z.string() })) }))).catch(() => null),
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
