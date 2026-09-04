import { z } from 'zod';
import { apiClient } from '@/lib/api';
import type { LiveCounters, StateOverview, DistrictSummary } from '../types';
import { DistrictSummarySchema, AlertSummarySchema } from '../schemas';

export async function fetchLiveCounters(): Promise<LiveCounters> {
  const [alerts, districts] = await Promise.all([
    apiClient.get('/alerts/summary', AlertSummarySchema),
    apiClient.get('/areas/districts', z.array(DistrictSummarySchema)),
  ]);

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
  const districts = await apiClient.get(
    '/areas/districts',
    z.array(DistrictSummarySchema)
  );

  return {
    population: 10086292,
    areaKmSq: 53483,
    literacy: 78.82,
    districts: districts.length,
    forestCoverage: 63,
    villages: 16817,
  };
}

export async function fetchAllDistricts(): Promise<DistrictSummary[]> {
  const areas = await apiClient.get(
    '/areas/districts',
    z.array(DistrictSummarySchema)
  );

  const districts: DistrictSummary[] = areas.map((area) => ({
    id: area.id,
    name: area.name.en,
    nameHi: area.name.hi,
    population: 0,
    activeAlerts: 0,
    slug: area.slug,
  }));

  return districts;
}
