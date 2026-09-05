import React from 'react';
import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { apiClient } from '@/lib/api';
import { z } from 'zod';
import { AreaSchema } from '@/features/dashboard/schemas';
import { ActiveAlertsSchema } from '@/features/alerts/schemas';
import { AreaIndicatorsSchema } from '@/features/indicators/schemas';
import { WeatherDataSchema } from '@/features/weather/schemas';
import { TerrainMap, fetchAlertFeatures, fetchDistrictFeatures } from '@/features/map';
import { formatIndicatorValue } from '@/features/indicators/format';

const DistrictDetailSchema = z.object({
  district: AreaSchema,
  tehsils: z.array(AreaSchema.extend({ villages: z.array(z.string()) })),
});

interface DistrictDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: DistrictDetailPageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const district = await apiClient.get(`/areas/districts/${slug}`, DistrictDetailSchema);
    return {
      title: `${district.district.name.en} — Pahad Pulse`,
      description: `Dashboard for ${district.district.name.en} district with weather, alerts, and statistics.`,
    };
  } catch {
    return {
      title: 'District Dashboard — Pahad Pulse',
    };
  }
}

export const dynamic = 'force-dynamic';

export default async function DistrictDetailPage({ params }: DistrictDetailPageProps) {
  const { slug } = await params;
  let district = null;
  let alerts = null;
  let indicators = null;
  let weather = null;
  let districts = null;
  let mapAlerts = null;
  let error = null;

  try {
    const [districtData, alertsData, indicatorsData, weatherData, districtFeatures, alertFeatures] =
      await Promise.all([
        apiClient.get(`/areas/districts/${slug}`, DistrictDetailSchema),
        apiClient.get(`/areas/${slug}/alerts`, ActiveAlertsSchema).catch(() => null),
        apiClient.get(`/areas/${slug}/indicators`, AreaIndicatorsSchema).catch(() => null),
        apiClient.get(`/areas/${slug}/weather`, WeatherDataSchema).catch(() => null),
        // The map degrades to absent rather than failing the page (geography.md §7).
        fetchDistrictFeatures().catch(() => null),
        fetchAlertFeatures().catch(() => null),
      ]);

    district = districtData;
    alerts = alertsData;
    indicators = indicatorsData;
    weather = weatherData;
    districts = districtFeatures;
    mapAlerts = alertFeatures;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load district data';
  }

  if (error || !district) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-bg-light p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p className="font-semibold">Unable to load district</p>
            <p className="text-sm mt-1">{error || 'District not found'}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const districtData = district.district;
  const tehsils = district.tehsils || [];
  const totalVillages = tehsils.reduce((sum, tehsil) => sum + tehsil.villages.length, 0);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        {/* Header */}
        <div className="bg-bg-dark text-text-dark py-8 px-6">
          <h1 className="font-display text-4xl font-bold">{districtData.name.en}</h1>
          <p className="text-text-dark/70 mt-2">{districtData.name.hi}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Terrain map, focused on this district. Navigation is off here — the user is
              already on the district they would be navigating to. */}
          {districts !== null && (
            <TerrainMap
              districts={districts}
              alerts={mapAlerts}
              focusSlug={slug}
              navigateOnClick={false}
            />
          )}

          {/* Active Alerts */}
          {alerts && alerts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h2 className="font-bold text-red-800 mb-2">
                🚨 {alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''}
              </h2>
              <ul className="space-y-2">
                {alerts.slice(0, 3).map((alert) => (
                  <li key={alert.id} className="text-sm text-red-700">
                    • {alert.headline}
                  </li>
                ))}
              </ul>
              {alerts.length > 3 && (
                <p className="text-sm text-red-700 mt-2">+{alerts.length - 3} more</p>
              )}
            </div>
          )}

          {/* Weather Data */}
          {weather && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface border border-border rounded-lg p-4">
                <p className="text-sm text-text-light/60 mb-1">🌡️ Temperature</p>
                <p className="text-2xl font-bold">{weather.temperature?.value || '—'}°C</p>
              </div>
              <div className="bg-surface border border-border rounded-lg p-4">
                <p className="text-sm text-text-light/60 mb-1">💧 Rainfall</p>
                <p className="text-2xl font-bold">{weather.rainfall?.value || '—'} mm</p>
              </div>
              <div className="bg-surface border border-border rounded-lg p-4">
                <p className="text-sm text-text-light/60 mb-1">💨 Humidity</p>
                <p className="text-2xl font-bold">{weather.humidity?.value || '—'}%</p>
              </div>
            </div>
          )}

          {/* Indicators / Statistics.
              Every figure carries its source and the year it describes — that pairing is the
              product's core promise, so it renders next to the number rather than in a
              footnote, and a synthetic value says so plainly. */}
          {indicators && indicators.length > 0 && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <h2 className="font-bold text-lg mb-4">Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {indicators.map((ind) => {
                  const isDemo = ind.provenance?.sourceKey === 'pahad-pulse-demo-data';
                  return (
                    <div key={ind.indicator.key} className="border-b border-border pb-3">
                      <p className="text-sm text-text-light/60">{ind.indicator.label.en}</p>
                      <p className="text-xl font-bold">
                        {formatIndicatorValue(ind.value, ind.indicator.unit, ind.indicator.decimals)}
                      </p>
                      <p className="text-xs text-text-light/40 mt-1">
                        {ind.vintage.slice(0, 4)} ·{' '}
                        {isDemo ? (
                          <span className="text-warning">
                            Demo data — no published figure yet
                          </span>
                        ) : (
                          <a
                            href={ind.provenance?.url ?? '#'}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="underline underline-offset-2 hover:text-text-light"
                          >
                            {ind.provenance?.department.en ?? 'Source unknown'}
                          </a>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tehsils and their villages.
              Village names come from OpenStreetMap and are placed in a tehsil by geometry,
              so coverage is uneven — a tehsil OSM has not drawn a boundary for shows none.
              That gap is stated rather than hidden, because an empty list here means "not
              mapped yet", not "no villages". */}
          {tehsils.length > 0 && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="font-bold text-lg">Tehsils ({tehsils.length})</h2>
                <p className="text-xs text-text-light/50">
                  {totalVillages.toLocaleString('en-IN')} villages mapped
                </p>
              </div>

              <div className="space-y-2">
                {tehsils.map((tehsil) => (
                  <details
                    key={tehsil.id}
                    className="group rounded-lg border border-border bg-bg-light/40 open:bg-surface"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3">
                      <span>
                        <span className="font-semibold">{tehsil.name.en}</span>
                        <span className="ml-2 text-sm text-text-light/50">{tehsil.name.hi}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs text-text-light/60">
                        {tehsil.villages.length > 0
                          ? `${tehsil.villages.length} villages`
                          : 'not mapped'}
                      </span>
                    </summary>

                    {tehsil.villages.length > 0 ? (
                      <ul className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-border px-4 py-3 text-sm text-text-light/80">
                        {tehsil.villages.map((village) => (
                          <li key={village}>{village}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="border-t border-border px-4 py-3 text-sm text-text-light/50">
                        No village boundaries mapped for this tehsil yet.
                      </p>
                    )}
                  </details>
                ))}
              </div>

              <p className="mt-4 text-xs leading-relaxed text-text-light/50">
                Village names from{' '}
                <a
                  href="https://www.openstreetmap.org"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline underline-offset-2"
                >
                  OpenStreetMap contributors
                </a>{' '}
                (ODbL), placed by geometry. Uttarakhand has about 16,800 villages in total, so
                this is a partial list — not every village is mapped, and a few may sit in a
                neighbouring tehsil.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
