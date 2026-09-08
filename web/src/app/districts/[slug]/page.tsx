import React from 'react';
import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { apiClient } from '@/lib/api';
import { z } from 'zod';
import { AreaSchema } from '@/features/dashboard/schemas';
import { ActiveAlertsSchema } from '@/features/alerts/schemas';
import { AlertCard } from '@/features/alerts/components';
import { AreaIndicatorsSchema } from '@/features/indicators/schemas';
import { WeatherDataSchema } from '@/features/weather/schemas';
import { WeatherPanel } from '@/features/weather/components';
import { TerrainMap, fetchAlertFeatures, fetchDistrictFeatures } from '@/features/map';
import { formatIndicatorValue } from '@/features/indicators/format';
import { AreaMigrationSchema, MigrationPanel } from '@/features/migration';

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

/** Two minutes: this page carries active alerts as well as weather, so it follows the
 *  alerts page's caution more closely than the weather page's hourly cadence. */
export const revalidate = 120;

/**
 * Prerender all 13 districts at build time.
 *
 * Without this the route is rendered on demand for every visit — `revalidate` alone does not
 * make a dynamic segment static, so each district page was paying the full round trip to the
 * API on every navigation. These are the most-visited pages in the product and there are
 * exactly 13 of them, a fixed set that changes only if the state creates a district, so
 * there is no reason to build them per request.
 *
 * Returning an empty list on failure is deliberate: the pages then fall back to on-demand
 * rendering, which is exactly today's behaviour. A build must not fail because the API was
 * briefly unreachable.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const districts = await apiClient.get(
      '/areas/districts',
      z.array(z.object({ slug: z.string() }))
    );
    return districts.map((district) => ({ slug: district.slug }));
  } catch {
    return [];
  }
}

export default async function DistrictDetailPage({ params }: DistrictDetailPageProps) {
  const { slug } = await params;
  let district = null;
  let alerts = null;
  let indicators = null;
  let weather = null;
  let migration = null;
  let districts = null;
  let mapAlerts = null;
  let error = null;

  try {
    const [
      districtData,
      alertsData,
      indicatorsData,
      weatherData,
      migrationData,
      districtFeatures,
      alertFeatures,
    ] =
      await Promise.all([
        apiClient.get(`/areas/districts/${slug}`, DistrictDetailSchema),
        apiClient.get(`/areas/${slug}/alerts`, ActiveAlertsSchema).catch(() => null),
        apiClient.get(`/areas/${slug}/indicators`, AreaIndicatorsSchema).catch(() => null),
        apiClient.get(`/areas/${slug}/weather`, WeatherDataSchema).catch(() => null),
        apiClient.get(`/areas/${slug}/migration`, AreaMigrationSchema).catch(() => null),
        // The map degrades to absent rather than failing the page (geography.md §7).
        fetchDistrictFeatures().catch(() => null),
        fetchAlertFeatures().catch(() => null),
      ]);

    district = districtData;
    alerts = alertsData;
    indicators = indicatorsData;
    weather = weatherData;
    migration = migrationData;
    districts = districtFeatures;
    mapAlerts = alertFeatures;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load district data';
  }

  if (error || !district) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-bg-light px-4 py-5 sm:px-6">
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
        <div className="bg-bg-dark px-4 py-6 text-text-dark sm:px-6 md:py-8">
          <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">
            {districtData.name.en}
          </h1>
          <p className="mt-1.5 text-sm text-text-dark/70 sm:mt-2 sm:text-base">{districtData.name.hi}</p>
        </div>

        <div className="space-y-5 px-4 py-5 sm:px-6 md:space-y-6 md:py-6">
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

          {/* The same AlertCard the alerts page uses, rather than a second, plainer
              rendering of the same warnings. One component means a district page can never
              drift into showing a different severity, or dropping the expiry, for an alert
              the alerts page shows in full. */}
          {alerts !== null && alerts.length > 0 && (
            <section aria-labelledby="district-alerts">
              <h2
                id="district-alerts"
                className="mb-3 text-lg font-semibold tracking-tight sm:text-xl"
              >
                {alerts.length} active alert{alerts.length === 1 ? '' : 's'}
              </h2>
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <AlertCard key={alert.id} alert={alert} index={index} />
                ))}
              </div>
            </section>
          )}

          {/* Weather. Still `weather && …`: the fetch below catches its own failure, so a
              district with no reading yet renders exactly as it did before this panel
              existed rather than showing a zero. */}
          {weather && <WeatherPanel weather={weather} />}

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

          {/* Out-migration, from the state Migration Commission's two survey rounds.
              Rendered even when the district has no figures: the panel then states that they
              are being compiled. A silently absent panel and a broken one look the same. */}
          {migration !== null && (
            <section aria-labelledby="district-migration">
              <h2
                id="district-migration"
                className="mb-3 text-lg font-semibold tracking-tight sm:text-xl"
              >
                Migration
              </h2>
              <MigrationPanel data={migration} />
            </section>
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
