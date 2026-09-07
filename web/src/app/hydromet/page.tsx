import React from 'react';
import type { Metadata } from 'next';
import { CloudSun, Wind } from 'lucide-react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { apiClient } from '@/lib/api';
import { WeatherDataSchema } from '@/features/weather/schemas';
import { WeatherPanel } from '@/features/weather/components';
import { fetchAllDistrictAirQuality } from '@/features/weather/batch';
import {
  AirQualityCard,
  AirQualitySummary,
} from '@/features/air-quality/components/air-quality-panel';

export const metadata: Metadata = {
  title: 'Weather & Air — Pahad Pulse',
  description:
    'Current weather and air quality for every district of Uttarakhand, with the source behind every figure.',
};

/** Five minutes: the weather and air connectors both run hourly, so this is well inside
 *  their own cadence while turning nearly every navigation into a cache hit. */
export const revalidate = 300;

/**
 * Weather and air quality for the whole state.
 *
 * River levels are deliberately absent. The page previously called `/rivers/levels`, which
 * has never existed — CWC access is unresolved, and the one keyless discharge model
 * available returns 0.17 m³/s for the Ganga at Haridwar because it snaps to a tributary
 * grid cell. A wrong river level on a public safety page is worse than no river level, so
 * the section says what is missing and why rather than showing a number.
 */
export default async function WeatherPage() {
  /*
   * Two requests, not fifteen. The air readings for all thirteen districts come back in one
   * batch; Dehradun's weather is fetched separately because this page shows its full 7-day
   * forecast, which the batch deliberately omits.
   *
   * Each still degrades on its own: one failing must not blank the other.
   */
  const [airEntries, dehradunWeather] = await Promise.all([
    fetchAllDistrictAirQuality().catch(() => []),
    apiClient.get('/areas/dehradun/weather', WeatherDataSchema).catch(() => null),
  ]);

  const air = airEntries
    .map((entry) => entry.air)
    .filter((reading): reading is NonNullable<typeof reading> => reading !== null);

  return (
    <DashboardLayout>
      <div className="min-h-full">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 md:py-6 lg:px-8">
            <p className="mb-1.5 text-sm font-medium text-muted-foreground">Live systems</p>
            <h1 className="flex items-center gap-2 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] sm:text-3xl text-text-light">
              <CloudSun className="size-6 text-accent" strokeWidth={1.8} aria-hidden="true" />
              Weather &amp; air
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Current conditions and air quality at every district headquarters, updated
              hourly.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
          {dehradunWeather !== null && (
            <section aria-labelledby="capital-weather">
              <h2 id="capital-weather" className="sr-only">
                Weather at the state capital
              </h2>
              <div className="pp-rise">
                <WeatherPanel weather={dehradunWeather} />
              </div>
            </section>
          )}

          <section aria-labelledby="air-heading">
            <div className="mb-4">
              <h2
                id="air-heading"
                className="flex items-center gap-2 text-xl font-semibold tracking-tight"
              >
                <Wind className="size-5 text-accent" strokeWidth={1.8} aria-hidden="true" />
                Air quality by district
              </h2>
              <div className="mt-2">
                <AirQualitySummary readings={air} />
              </div>
            </div>

            {air.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No air quality readings are available yet. They arrive with the hourly
                ingestion run.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {air.map((reading, index) => (
                  <AirQualityCard key={reading.station.id} data={reading} index={index} />
                ))}
              </div>
            )}

            {air[0] !== undefined && (
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                {air[0].source.attribution}. These are modelled estimates covering every
                district, not readings from a ground monitor. The Central Pollution Control
                Board operates reference-grade stations in some Uttarakhand towns and its
                figures are authoritative where they exist.
              </p>
            )}
          </section>

          {/* Stated, not hidden. A "Rivers" heading with nothing under it invites the
              assumption that the rivers are fine. */}
          <section aria-labelledby="rivers-heading">
            <h2 id="rivers-heading" className="text-xl font-semibold tracking-tight">
              River levels
            </h2>
            <div className="mt-3 rounded-lg border border-warning/40 bg-warning-soft/60 px-4 py-3">
              <p className="text-sm leading-relaxed text-text-light">
                <span className="font-semibold">No river level data is published here yet.</span>{' '}
                River gauge readings come from the Central Water Commission, and access has
                not been arranged. Until it is, this page shows nothing rather than an
                estimate — a wrong river level is more dangerous than an absent one. Check
                CWC or the district administration for current levels.
              </p>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
