/** @jest-environment node */

import { fetchAllDistrictAirQuality, fetchAirQuality } from '@/features/air-quality/services';
import {
  fetchActiveAlerts,
  fetchAlertById,
  fetchAlertSummary,
  fetchAreaAlerts,
} from '@/features/alerts/services';
import { fetchDistrictDetail, fetchDistricts } from '@/features/areas/services';
import {
  compareDistricts,
  fetchBusinessSchemes,
  fetchScenarios,
} from '@/features/business/services';
import { fetchAreaNetwork, fetchStateNetwork } from '@/features/connectivity/services';
import { fetchDepartmentBudget, fetchDistrictStanding } from '@/features/governance/services';
import { fetchAllIndicators, fetchAreaIndicators } from '@/features/indicators/services';
import { fetchAlertFeatures, fetchDistrictFeatures } from '@/features/map/services';
import { fetchRoadClosures, fetchRoadNetwork } from '@/features/roads/services';
import { fetchRecentSeismic } from '@/features/seismic/services';
import { fetchSources } from '@/features/sources/services';
import { fetchPilgrimArrivals, fetchTourismGuide } from '@/features/tourism/services';
import { fetchAreaWeather } from '@/features/weather/services';
import { env } from '@/config/env';

const describeLive = process.env.LIVE_API_TEST === '1' ? describe : describe.skip;
const nodeFetch = require('node-fetch') as unknown as typeof fetch;

/**
 * Contract test against the deployed public API.
 *
 * This is opt-in so ordinary unit tests stay deterministic. Every call goes through the same
 * service and Zod schema as the app, proving more than a status-code smoke test: a response
 * that drifted away from the mobile contract fails here before a store build ships.
 */
describeLive('production mobile API contract', () => {
  jest.setTimeout(60_000);

  beforeAll(() => {
    // jest-expo installs a native fetch stub. Live contracts need an actual Node HTTP client.
    global.fetch = nodeFetch;
  });

  const districtSlug = 'dehradun';

  it('reports the production process and database as ready', async () => {
    const origin = new URL(env.apiUrl).origin;
    const [health, readiness] = await Promise.all([
      nodeFetch(`${origin}/health`),
      nodeFetch(`${origin}/ready`),
    ]);

    expect(health.status).toBe(200);
    expect(readiness.status).toBe(200);
    await expect(readiness.json()).resolves.toMatchObject({ status: 'ready' });
  });

  it('loads the complete district list and district detail', async () => {
    const districts = await fetchDistricts();
    expect(districts).toHaveLength(13);
    expect(districts.some((district) => district.slug === districtSlug)).toBe(true);

    const detail = await fetchDistrictDetail(districtSlug);
    expect(detail.district.slug).toBe(districtSlug);
    expect(detail.tehsils.length).toBeGreaterThan(0);
  });

  it('loads district weather, indicators, alerts, connectivity and air quality', async () => {
    const [weather, indicators, alerts, connectivity, air] = await Promise.all([
      fetchAreaWeather(districtSlug),
      fetchAreaIndicators(districtSlug),
      fetchAreaAlerts(districtSlug),
      fetchAreaNetwork(districtSlug),
      fetchAirQuality(districtSlug),
    ]);

    expect(weather.station.areaId).toBeGreaterThan(0);
    expect(indicators.values.length).toBeGreaterThan(0);
    expect(Array.isArray(alerts)).toBe(true);
    expect(connectivity.slug).toBe(districtSlug);
    expect(air.station.areaId).toBeGreaterThan(0);
  });

  it('loads statewide alert and map data', async () => {
    const [summary, alerts, districts, alertFeatures] = await Promise.all([
      fetchAlertSummary(),
      fetchActiveAlerts({ limit: 100 }),
      fetchDistrictFeatures(),
      fetchAlertFeatures(),
    ]);

    expect(summary.activeCount).toBeGreaterThanOrEqual(0);
    expect(alerts).toHaveLength(summary.activeCount);
    expect(districts.features).toHaveLength(13);
    expect(Array.isArray(alertFeatures.features)).toBe(true);

    const firstAlert = alerts[0];
    if (firstAlert) {
      const detail = await fetchAlertById(firstAlert.id);
      expect(detail.id).toBe(firstAlert.id);
    }
  });

  it('loads populated roads, seismic, connectivity and air-quality datasets', async () => {
    const [roads, seismic, connectivity, air] = await Promise.all([
      fetchRoadNetwork(),
      fetchRecentSeismic(),
      fetchStateNetwork(),
      fetchAllDistrictAirQuality(),
    ]);

    expect(roads.national.length + roads.state.length).toBeGreaterThan(0);
    expect(seismic.events.length).toBeGreaterThan(0);
    expect(connectivity.districts.length).toBeGreaterThan(0);
    expect(air).toHaveLength(13);
    expect(air.some((entry) => entry.air !== null)).toBe(true);
  });

  it('loads pilgrim arrivals and a complete business comparison', async () => {
    const [arrivals, scenarios] = await Promise.all([fetchPilgrimArrivals(), fetchScenarios()]);

    expect(arrivals.destinations.length).toBeGreaterThan(0);
    expect(arrivals.totals.length).toBeGreaterThan(0);
    expect(scenarios.length).toBeGreaterThan(0);

    const scenario = scenarios[0];
    if (!scenario) throw new Error('The production API returned no business scenarios.');

    const comparison = await compareDistricts(districtSlug, 'almora', scenario.id);
    expect(comparison).not.toBeNull();
    expect(comparison?.districtA.slug).toBe(districtSlug);
    expect(comparison?.districtB.slug).toBe('almora');
  });

  it('loads the tools added for web parity: guide, closures, schemes, budget, catalogue', async () => {
    const [guide, statewide, district, schemes, budget, standing, catalogue, sources] =
      await Promise.all([
        fetchTourismGuide(),
        fetchRoadClosures(),
        fetchRoadClosures('chamoli'),
        fetchBusinessSchemes(),
        fetchDepartmentBudget(),
        fetchDistrictStanding(),
        fetchAllIndicators(),
        fetchSources(),
      ]);

    expect(guide.charDham).toHaveLength(4);
    // Unavailable closures must carry a reason, never pose as "no closures".
    for (const report of [statewide, district]) {
      if (!report.available) expect(report.unavailableReason).not.toBeNull();
    }
    expect(schemes.schemes.length).toBeGreaterThan(0);
    expect(budget.availableYears.length).toBeGreaterThan(0);
    expect(standing.districts).toHaveLength(13);
    expect(catalogue.length).toBeGreaterThan(0);
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((source) => source.department.en.length > 0)).toBe(true);
  });
});
