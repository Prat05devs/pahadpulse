import React from 'react';
import type { Metadata } from 'next';
import { ExternalLink, MountainSnow } from 'lucide-react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { fetchPilgrimArrivals } from '@/features/tourism/services';
import { PilgrimArrivalsTable } from '@/features/tourism/components/pilgrim-arrivals-table';

export const metadata: Metadata = {
  title: 'Tourism & Pilgrim Load — Pahad Pulse',
  description:
    'Published pilgrim arrivals at the Char Dham shrines and Hemkund Sahib, by year and district.',
};

/** A day. These are published annual totals; they cannot change between requests. */
export const revalidate = 86400;

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
  const first = arrivals?.totals[0];
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
              How many pilgrims reached each shrine, as counted by the state tourism department.
              These are yearly totals — this page does not say how busy a shrine is today, and no
              carrying capacity has been published to measure a load against.
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

          {arrivals !== null && first !== undefined && latest !== undefined && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
                  <p className="text-sm text-muted-foreground">Pilgrims in {latest.year}</p>
                  <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-text-light">
                    {n(latest.visitors)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    across all five shrines counted together
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
                  <p className="text-sm text-muted-foreground">Pilgrims in {first.year}</p>
                  <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-text-light">
                    {n(first.visitors)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    the last full season before the yatra was suspended
                  </p>
                </div>
              </div>

              <section aria-labelledby="by-shrine">
                <h2
                  id="by-shrine"
                  className="mb-3 text-lg font-semibold tracking-tight text-text-light sm:text-xl"
                >
                  Arrivals by shrine
                </h2>
                <PilgrimArrivalsTable data={arrivals} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {first.year} is the last full season before the pandemic;{' '}
                  {arrivals.years.slice(1).join(' and ')} were suspended and then capped. The
                  figures are shown as published rather than smoothed — the fall is what happened,
                  not a gap in the data.
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
