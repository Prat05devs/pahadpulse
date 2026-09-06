import React from 'react';
import type { Metadata } from 'next';
import { z } from 'zod';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { apiClient } from '@/lib/api';
import { DistrictSummarySchema } from '@/features/dashboard/schemas';
import { WeatherDataSchema } from '@/features/weather/schemas';
import {
  DistrictCarousel,
  type CarouselDistrict,
} from '@/features/districts/components/district-carousel';

export const metadata: Metadata = {
  title: 'Districts — Pahad Pulse',
  description:
    'The thirteen districts of Uttarakhand, with current conditions and administrative figures.',
};

export const dynamic = 'force-dynamic';

export default async function DistrictsListPage() {
  let districts = null;
  let error = null;

  try {
    districts = await apiClient.get('/areas/districts', z.array(DistrictSummarySchema));
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load districts';
  }

  /**
   * Weather for each district, settled individually.
   *
   * Thirteen requests rather than one because there is no batch endpoint — and settling
   * them separately matters more than the round trips: a district whose ingestion has not
   * run returns 404, and one missing reading must leave that card without a temperature
   * rather than stripping the weather from all thirteen.
   */
  const weather = await Promise.all(
    (districts ?? []).map((district) =>
      apiClient
        .get(`/areas/${district.slug}/weather`, WeatherDataSchema)
        .catch(() => null)
    )
  );

  const cards: CarouselDistrict[] = (districts ?? []).map((district, index) => {
    const reading = weather[index];
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
            Thirteen districts, each shown by the place it is known for. Swipe or use the
            arrows.
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
