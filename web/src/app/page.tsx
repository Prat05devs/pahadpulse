import React from 'react';
import type { Metadata } from 'next';
import { AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { fetchAlertFeatures, fetchDistrictFeatures } from '@/features/map';
import {
  DistrictOverviewGrid,
  LiveCounters,
  MapStage,
  QuickAccessGrid,
  SourceStatusPanel,
  StateOverviewCard,
} from '@/features/dashboard/components';
import {
  fetchAllDistricts,
  fetchImdCapLiveStatus,
  fetchLiveCounters,
  fetchStateOverview,
} from '@/features/dashboard/services';

export const metadata: Metadata = {
  title: 'Home Dashboard — Pahad Pulse',
  description: 'Live state-level overview of Uttarakhand with interactive map and key metrics.',
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let counters = null;
  let overview = null;
  let districts = null;
  let error = null;
  let imdStatus = null;
  let imdStatusError = null;
  let districtFeatures = null;
  let alertFeatures = null;
  let mapError: string | null = null;

  const [dashboardResult, imdStatusResult, mapResult] = await Promise.allSettled([
    Promise.all([fetchLiveCounters(), fetchStateOverview(), fetchAllDistricts()]),
    fetchImdCapLiveStatus(),
    // Settled independently: the map failing must not take the dashboard's figures with it.
    Promise.all([fetchDistrictFeatures(), fetchAlertFeatures()]),
  ]);

  if (mapResult.status === 'fulfilled') {
    [districtFeatures, alertFeatures] = mapResult.value;
  } else {
    const caughtError = mapResult.reason;
    mapError = caughtError instanceof Error ? caughtError.message : 'map data unavailable';
  }

  if (dashboardResult.status === 'fulfilled') {
    [counters, overview, districts] = dashboardResult.value;
  } else {
    const caughtError = dashboardResult.reason;
    error =
      caughtError instanceof Error
        ? caughtError.message
        : 'Dashboard data is temporarily unavailable.';
  }

  if (imdStatusResult.status === 'fulfilled') {
    imdStatus = imdStatusResult.value;
  } else {
    const caughtError = imdStatusResult.reason;
    imdStatusError =
      caughtError instanceof Error
        ? caughtError.message
        : 'The IMD CAP live source check is temporarily unavailable.';
  }

  return (
    <DashboardLayout>
      <div className="min-h-full">

        <div className="lg:relative">
          {!counters || !overview || !districts ? (
            <section
              className="surface-card mx-4 my-6 flex flex-col items-start gap-4 p-6 sm:mx-6 sm:flex-row lg:mx-8"
              role="alert"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
                <AlertCircle className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Live data is taking longer than expected</h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {error ||
                    'The dashboard could not reach the data service. Please try again shortly.'}
                </p>
              </div>
            </section>
          ) : (
            <>
              {/* The map is the page on desktop: full-bleed, with the figures floating in
                  its corners. Below `lg` it returns to normal flow with the cards stacked
                  beneath it — see MapStage for why that inversion is not optional. */}
              <MapStage
                districts={districtFeatures}
                alerts={alertFeatures}
                counters={counters}
                overview={overview}
                mapError={mapError}
              />

              {/* Everything below scrolls under the map. The floating cards are a summary,
                  not a replacement: the full figures with their sources stay here, because
                  a card with room for three numbers cannot carry provenance for six. */}
              <div className="mx-auto max-w-7xl space-y-10 px-4 pb-6 pt-8 sm:px-6 md:space-y-12 lg:px-8">
                <LiveCounters data={counters} />

                <div className="pp-rise" style={{ '--pp-delay': '120ms' } as React.CSSProperties}>
                  <StateOverviewCard data={overview} />
                </div>

                <div className="pp-rise" style={{ '--pp-delay': '200ms' } as React.CSSProperties}>
                  <QuickAccessGrid />
                </div>
                <DistrictOverviewGrid districts={districts} />

                {/* Connection health sits after the data it describes: it explains where the
                    figures above came from, so leading with it buried the dashboard. */}
                <div className="pp-rise" style={{ '--pp-delay': '280ms' } as React.CSSProperties}>
                  <SourceStatusPanel status={imdStatus} error={imdStatusError} />
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <p>Official sources are shown alongside every published figure.</p>
            <p>Built for residents, travellers and journalists.</p>
          </div>
        </footer>
      </div>
    </DashboardLayout>
  );
}
