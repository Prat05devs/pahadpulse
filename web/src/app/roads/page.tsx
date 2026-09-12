import React from 'react';
import { Route } from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { fetchDistrictFeatures } from '@/features/map';
import { fetchRoadNetwork } from '@/features/roads/services';
import { HighwayExplorer } from '@/features/roads/components/highway-explorer';

export const metadata = buildPageMetadata({
  title: 'Uttarakhand Roads & Highways Map',
  description:
    'Explore National and State Highways across Uttarakhand on an interactive terrain map, with clear source attribution and coverage limitations.',
  path: '/roads',
  keywords: ['Uttarakhand highway map', 'Uttarakhand roads', 'NH SH Uttarakhand'],
});

/** An hour. The highway network comes from OpenStreetMap on a weekly cron — it changes on
 *  the timescale of government notifications, not minutes. */
export const revalidate = 3600;

export default async function RoadsPage() {
  let network = null;
  let districts = null;
  let error: string | null = null;

  const [networkResult, districtResult] = await Promise.allSettled([
    fetchRoadNetwork(),
    fetchDistrictFeatures(),
  ]);

  if (networkResult.status === 'fulfilled') {
    network = networkResult.value;
  } else {
    const caught = networkResult.reason;
    error = caught instanceof Error ? caught.message : 'Road network unavailable';
  }

  if (districtResult.status === 'fulfilled') districts = districtResult.value;

  const attribution = network?.national[0]?.provenance ?? network?.state[0]?.provenance ?? null;

  return (
    <DashboardLayout>
      <div className="min-h-full">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 md:py-6 lg:px-8">
            <p className="mb-1.5 text-sm font-medium text-muted-foreground">Live systems</p>
            <h1 className="flex items-center gap-2 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] sm:text-3xl text-text-light">
              <Route className="size-6 text-accent" strokeWidth={1.8} aria-hidden="true" />
              Roads &amp; highways
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              The highway network drawn over the terrain it crosses. National highways in blue,
              state highways in gold.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
          {/* Stated up front, not in a footnote. A traveller arriving on a roads page is
              looking for whether a road is passable, and this page cannot answer that — so
              it says so before they read anything else. */}
          <div className="rounded-lg border border-warning/40 bg-warning-soft/60 px-4 py-3">
            <p className="text-sm text-text-light">
              <span className="font-semibold">
                This map shows which highways exist, not whether they are open.
              </span>{' '}
              Closures and landslide blocks are reported manually by district officials and have no
              live feed yet, so none are shown here. Check current road status with the district
              administration before travelling.
            </p>
          </div>

          {error !== null && (
            <p className="text-sm text-muted-foreground">Road network unavailable — {error}</p>
          )}

          <HighwayExplorer network={network} districts={districts} />

          {attribution !== null && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Highway references from{' '}
              <a
                href={attribution.url ?? 'https://www.openstreetmap.org'}
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2 hover:text-text-light"
              >
                {attribution.department.en}
              </a>
              , read {attribution.vintage}. This is a crowd-sourced map, not an NHAI or PWD register
              — a highway may be missing or newly renumbered.
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
