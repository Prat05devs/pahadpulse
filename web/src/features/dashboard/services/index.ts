import { z } from 'zod';
import { apiClient } from '@/lib/api';
import type { DistrictSummary, ImdCapLiveStatus, LiveCounters, StateOverview } from '../types';
import {
  AlertSummarySchema,
  DistrictSummarySchema,
  ImdCapLiveStatusSchema,
  PopulationRankingSchema,
} from '../schemas';

export async function fetchImdCapLiveStatus(): Promise<ImdCapLiveStatus> {
  return apiClient.get('/sources/imd-cap-alerts/live', ImdCapLiveStatusSchema, {
    cache: 'no-store',
  });
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

export async function fetchStateOverview(): Promise<StateOverview> {
  const districts = await apiClient.get('/areas/districts', z.array(DistrictSummarySchema));

  return {
    // Census of India 2011 state totals. These are the published state figures, not a sum of
    // our district rows — summing would silently drift if one district failed to ingest.
    population: 10086292,
    areaKmSq: 53483,
    literacy: 78.82,
    districts: districts.length,
    forestCoverage: 63,
    villages: 16817,
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
