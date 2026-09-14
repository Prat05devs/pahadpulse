import React from 'react';
import { ExternalLink, MountainSnow } from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { fetchPilgrimArrivals } from '@/features/tourism/services';
import { PilgrimArrivalsTable } from '@/features/tourism/components/pilgrim-arrivals-table';

export const metadata = buildPageMetadata({
  title: 'Uttarakhand Tourism & Char Dham Pilgrim Data',
  description:
    'Explore published pilgrim arrivals for Char Dham shrines and Hemkund Sahib by year and district, with transparent Uttarakhand tourism sources.',
  path: '/tourism',
  keywords: ['Char Dham visitor data', 'Uttarakhand tourism statistics', 'Hemkund Sahib pilgrims'],
});

// Fetch at request time so deploy-time failures and expired alerts are not cached as pages.
export const dynamic = 'force-dynamic';

const n = (value: number) => value.toLocaleString('en-IN');

export default async function TourismPage() {
  let arrivals = null;
  let error: string | null = null;

  try {
    arrivals = await fetchPilgrimArrivals();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Pilgrim arrivals unavailable';
  }

  const latest = arrivals?.totals[arrivals.totals.length - 1];
  const recordYear = arrivals?.totals.find((t) => t.year === 2025);
  const source = arrivals?.destinations[0]?.years[0]?.provenance ?? null;

  return (
    <DashboardLayout>
      <div className="min-h-full">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 md:py-6 lg:px-8">
            <p className="mb-1.5 text-sm font-medium text-muted-foreground">Published figures</p>
            <h1 className="flex items-center gap-2 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] text-text-light sm:text-3xl">
              <MountainSnow className="size-6 text-accent" strokeWidth={1.8} aria-hidden="true" />
              Tourism &amp; pilgrim load
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              How many tourists and pilgrims reached each destination, as counted by the state tourism department.
              These are yearly totals — this page does not say how busy a destination is today, and no
              carrying capacity has been published for most locations to measure a load against.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 md:py-6 lg:px-8">
          {error !== null && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              <p className="font-semibold">Unable to load pilgrim arrivals</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          {arrivals !== null && latest !== undefined && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
                  <p className="text-sm text-muted-foreground">Tourists in {latest.year}</p>
                  <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-text-light">
                    {n(latest.visitors)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    across listed destinations (Ongoing)
                  </p>
                </div>
                {recordYear !== undefined && (
                  <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
                    <p className="text-sm text-muted-foreground">Tourists in {recordYear.year}</p>
                    <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-text-light">
                      {n(recordYear.visitors)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      (All-time record)
                    </p>
                  </div>
                )}
              </div>

              <section aria-labelledby="by-destination">
                <h2
                  id="by-destination"
                  className="mb-3 text-lg font-semibold tracking-tight text-text-light sm:text-xl"
                >
                  Arrivals by destination
                </h2>
                <div className="mb-4 rounded border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800">
                  <p className="font-semibold text-sm">Tentative 2026 Data</p>
                  <p className="mt-1 text-xs">
                    The 2026 Yatra is currently ongoing. These figures represent the latest available estimates and are not final.
                  </p>
                </div>
                <PilgrimArrivalsTable data={arrivals} />
                <p className="mt-2 text-xs text-muted-foreground">
                  The 2020-2021 seasons were suspended and then capped due to the pandemic. The figures are shown as published rather than smoothed.
                </p>
              </section>

              {source !== null && (
                <p className="text-xs text-muted-foreground">
                  {source.attribution}.{' '}
                  {source.url !== null && (
                    <a
                      className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-text-light"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Source
                      <ExternalLink className="size-3" strokeWidth={1.8} aria-hidden="true" />
                    </a>
                  )}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
