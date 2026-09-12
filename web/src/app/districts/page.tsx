import React from 'react';
import { z } from 'zod';
import { buildPageMetadata } from '@/lib/seo';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { apiClient } from '@/lib/api';
import { DistrictSummarySchema } from '@/features/dashboard/schemas';
import { fetchAllDistrictWeather } from '@/features/weather/batch';
import {
  DistrictCarousel,
  type CarouselDistrict,
} from '@/features/districts/components/district-carousel';

export const metadata = buildPageMetadata({
  title: 'All 13 Uttarakhand Districts: Data & Live Conditions',
  description:
    'Explore all 13 Uttarakhand districts with current conditions, bilingual names, administrative figures, and direct access to district intelligence dashboards.',
  path: '/districts',
  keywords: [
    '13 districts of Uttarakhand',
    'Uttarakhand district data',
    'Uttarakhand district dashboard',
  ],
});

/**
 * Cached for five minutes rather than rendered fresh on every navigation.
 *
 * `force-dynamic` meant every click re-rendered the page and re-fetched everything. Weather
 * updates hourly and the district list changes by migration, so a five-minute window serves
 * almost every visit from cache and still shows a reading well inside its own cadence.
 *
 * Next serves the cached page instantly and regenerates behind it, so a slow or failed API
 * degrades to slightly older data rather than a slow page — which is also why the outage
 * that took this site down would have been far less visible.
 */
export const revalidate = 300;

export default async function DistrictsListPage() {
  let districts = null;
  let error = null;

  try {
    districts = await apiClient.get('/areas/districts', z.array(DistrictSummarySchema));
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load districts';
  }

  /*
   * One request for all thirteen districts' weather, not thirteen.
   *
   * The batch endpoint returns an entry per district with `weather: null` where a reading
   * is missing, so a district whose ingestion has not run still renders — the property the
   * per-district version got from settling each call separately, kept without the round
   * trips. Its own failure is caught so the carousel renders without temperatures rather
   * than not at all.
   */
  const weatherByslug = new Map(
    (await fetchAllDistrictWeather().catch(() => [])).map((entry) => [
      entry.areaSlug,
      entry.weather,
    ])
  );

  const cards: CarouselDistrict[] = (districts ?? []).map((district) => {
    const reading = weatherByslug.get(district.slug) ?? null;
    return {
      id: district.id,
      slug: district.slug,
      name: district.name,
      tehsils: district.counts.tehsils,
      villages: district.counts.villages,
      weather:
        reading == null
          ? null
          : {
              temperatureC: reading.temperature?.value ?? null,
              humidityPct: reading.humidity?.value ?? null,
              windKmh: reading.wind?.value ?? null,
              condition: reading.condition?.label.en ?? null,
              station: reading.station.name.en,
            },
    };
  });

  return (
    <DashboardLayout>
      <div className="relative min-h-screen bg-bg-light">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(55rem_35rem_at_20%_-10%,rgba(56,102,181,0.10),transparent),radial-gradient(45rem_30rem_at_90%_5%,rgba(47,111,98,0.09),transparent)]"
        />

        <div className="px-4 pb-2 pt-6 sm:px-6 md:pt-8">
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl">
            Districts
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Thirteen districts, each shown by the place it is known for. Swipe or use the arrows.
          </p>
        </div>

        <div className="px-0 pb-8">
          {error !== null && (
            <div className="mx-4 mb-6 rounded-lg border border-warning/50 bg-warning-soft/60 px-4 py-3 sm:mx-6">
              <p className="font-semibold text-text-light">Unable to load districts</p>
              <p className="mt-1 text-sm text-text-light/80">{error}</p>
            </div>
          )}

          {cards.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground sm:px-6">
              No districts found.
            </p>
          ) : (
            <DistrictCarousel districts={cards} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
