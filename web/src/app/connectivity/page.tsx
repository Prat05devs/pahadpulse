import React from 'react';
import type { Metadata } from 'next';
import { Clock3, ExternalLink, Wifi } from 'lucide-react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { SpeedTable, fetchStateNetwork } from '@/features/connectivity';

export const metadata: Metadata = {
  title: 'Internet Connectivity — Pahad Pulse',
  description:
    'Measured internet speeds by district in Uttarakhand, from Speedtest by Ookla open data.',
};

/** A day. Ookla publishes once a quarter; these cannot change between requests. */
export const revalidate = 86400;

function quarterLabel(quarterStart: string | null): string {
  if (quarterStart === null) return 'the latest quarter';
  const date = new Date(`${quarterStart}T00:00:00Z`);
  return `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
}

export default async function ConnectivityPage() {
  let data = null;
  let error: string | null = null;

  try {
    data = await fetchStateNetwork();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Network measurements unavailable';
  }

  const fixed = data?.spread.find((entry) => entry.kind === 'fixed');
  const mobile = data?.spread.find((entry) => entry.kind === 'mobile');
  const source = data?.districts[0]?.connections[0]?.provenance ?? null;
  const nameOf = (slug: string) =>
    data?.districts.find((district) => district.slug === slug)?.name.en ?? slug;

  return (
    <DashboardLayout>
      <div className="min-h-full">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 md:py-6 lg:px-8">
            <p className="mb-1.5 text-sm font-medium text-muted-foreground">Measured performance</p>
            <h1 className="flex items-center gap-2 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] text-text-light sm:text-3xl">
              <Wifi className="size-6 text-accent" strokeWidth={1.8} aria-hidden="true" />
              Internet connectivity
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              How fast the internet actually is in each district — from speed tests people ran
              themselves, aggregated to {quarterLabel(data?.quarterStart ?? null)} and cut against
              district boundaries. These are measurements, not coverage maps and not advertised
              speeds.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 md:py-6 lg:px-8">
          {error !== null && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              <p className="font-semibold">Unable to load network measurements</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          {data !== null && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {fixed !== undefined && (
                  <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
                    <p className="text-sm text-muted-foreground">
                      Fixed broadband, fastest against slowest district
                    </p>
                    <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-text-light">
                      {fixed.ratio}×
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {nameOf(fixed.fastest.slug)} gets {fixed.fastest.downloadMbps} Mbps;{' '}
                      {nameOf(fixed.slowest.slug)} gets {fixed.slowest.downloadMbps}. State average{' '}
                      {fixed.stateAverageMbps} Mbps.
                    </p>
                  </div>
                )}
                {mobile !== undefined && (
                  <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
                    <p className="text-sm text-muted-foreground">
                      Mobile, fastest against slowest district
                    </p>
                    <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-text-light">
                      {mobile.ratio}×
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {nameOf(mobile.fastest.slug)} gets {mobile.fastest.downloadMbps} Mbps;{' '}
                      {nameOf(mobile.slowest.slug)} gets {mobile.slowest.downloadMbps}. State
                      average {mobile.stateAverageMbps} Mbps.
                    </p>
                  </div>
                )}
              </div>

              <section aria-labelledby="fixed-speeds">
                <h2
                  id="fixed-speeds"
                  className="mb-3 text-lg font-semibold tracking-tight text-text-light sm:text-xl"
                >
                  Fixed broadband by district
                </h2>
                <SpeedTable data={data} kind="fixed" />
              </section>

              <section aria-labelledby="mobile-speeds">
                <h2
                  id="mobile-speeds"
                  className="mb-3 text-lg font-semibold tracking-tight text-text-light sm:text-xl"
                >
                  Mobile by district
                </h2>
                <SpeedTable data={data} kind="mobile" />
              </section>

              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <h2 className="text-sm font-semibold text-text-light">How to read this</h2>
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                  <li>
                    A speed test happens when someone chooses to run one — often because they
                    suspect a problem, or because they just joined good wifi. Neither is a random
                    sample of the district. The figures compare fairly between districts, because
                    the same habit applies in each; they are not &ldquo;the speed in this
                    district&rdquo;.
                  </li>
                  <li>
                    Districts with few tests are marked <strong>thin</strong>. Dehradun&rsquo;s
                    fixed figure rests on thousands of tests; the smallest hill districts on a few
                    hundred.
                  </li>
                  <li>
                    Nothing here says whether a village has coverage at all. That needs a different
                    source, and we do not have one yet.
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-text-light">
                  <Clock3
                    className="size-4 text-muted-foreground"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  Being compiled
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Fibre readiness under BharatNet — how many gram panchayats in each district have a
                  working fibre connection — is published by the Department of Telecommunications
                  and is not loaded yet. Mobile tower coverage by operator is also missing: the open
                  databases for it are crowdsourced, which would undercount exactly the remote
                  districts this portal exists to serve, so we would rather show nothing than
                  something misleading.
                </p>
              </div>

              {data.notMeasured.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  No speed tests were recorded this quarter in:{' '}
                  {data.notMeasured.map((district) => district.name.en).join(', ')}.
                </p>
              )}

              {source !== null && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {source.attribution}{' '}
                  {source.url !== null && (
                    <a
                      className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-text-light"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Dataset
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
