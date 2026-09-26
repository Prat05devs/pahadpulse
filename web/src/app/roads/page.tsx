import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  Construction,
  RotateCcw,
  Route,
  TriangleAlert,
} from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { fetchDistrictFeatures } from '@/features/map';
import { fetchRoadClosures, fetchRoadNetwork } from '@/features/roads/services';
import { closureCounts, formatIst } from '@/features/roads/closures';
import { HighwayExplorer } from '@/features/roads/components/highway-explorer';
import { RoadClosuresPanel } from '@/features/roads/components/road-closures-panel';
import type { RoadClosuresReport } from '@/features/roads/schemas';

export const metadata = buildPageMetadata({
  title: 'Uttarakhand Road Closures & Highways',
  description:
    'Road closures reported to PWD Uttarakhand, roads reopened in the last day, and the National and State Highway network on a terrain map — with every source named.',
  path: '/roads',
  keywords: [
    'Uttarakhand road closures',
    'Uttarakhand road status today',
    'Uttarakhand highway map',
    'landslide road blocked Uttarakhand',
  ],
});

/** A minute. Closures are polled from PWD every ten; a reopened road must not linger here. */
export const revalidate = 60;

type RoadFilter = 'all' | 'highways';

interface RoadsPageProps {
  searchParams: Promise<{ district?: string | string[]; type?: string | string[] }>;
}

const single = (value: string | string[] | undefined) =>
  typeof value === 'string' ? value : undefined;

function filterReport(
  report: RoadClosuresReport,
  district: string | undefined,
  type: RoadFilter
): RoadClosuresReport {
  const keep = (closure: RoadClosuresReport['closures'][number]) =>
    (district === undefined || closure.district?.slug === district) &&
    (type === 'all' || closure.roadType === 'NH' || closure.roadType === 'SH');
  return {
    ...report,
    closures: report.closures.filter(keep),
    recentlyReopened: report.recentlyReopened.filter(keep),
  };
}

function filterHref(district: string | undefined, type: RoadFilter) {
  const params = new URLSearchParams();
  if (district !== undefined) params.set('district', district);
  if (type !== 'all') params.set('type', type);
  const query = params.toString();
  return query === '' ? '/roads#closures' : `/roads?${query}#closures`;
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? 'true' : undefined}
      className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors ${active ? 'border-accent bg-info-soft text-accent' : 'border-border bg-surface hover:bg-surface-hover'}`}
    >
      {children}
    </Link>
  );
}

export default async function RoadsPage({ searchParams }: RoadsPageProps) {
  const params = await searchParams;
  const now = new Date();

  const [closuresResult, networkResult, districtResult] = await Promise.allSettled([
    fetchRoadClosures(),
    fetchRoadNetwork(),
    fetchDistrictFeatures(),
  ]);
  const report = closuresResult.status === 'fulfilled' ? closuresResult.value : null;
  const network = networkResult.status === 'fulfilled' ? networkResult.value : null;
  const districts = districtResult.status === 'fulfilled' ? districtResult.value : null;
  const networkError =
    networkResult.status === 'rejected'
      ? networkResult.reason instanceof Error
        ? networkResult.reason.message
        : 'Road network unavailable'
      : null;

  const type: RoadFilter = single(params.type) === 'highways' ? 'highways' : 'all';
  // Districts that appear in the report, so every chip leads somewhere with content.
  const districtOptions = [
    ...new Map(
      [...(report?.closures ?? []), ...(report?.recentlyReopened ?? [])]
        .flatMap((closure) => (closure.district === null ? [] : [closure.district]))
        .map((district) => [district.slug, district.name])
    ),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const requestedDistrict = single(params.district);
  const district = districtOptions.some(([slug]) => slug === requestedDistrict)
    ? requestedDistrict
    : undefined;
  const districtName = districtOptions.find(([slug]) => slug === district)?.[1];
  const visible = report?.available ? filterReport(report, district, type) : report;
  const counts = report?.available ? closureCounts(report) : null;
  const attribution = network?.national[0]?.provenance ?? network?.state[0]?.provenance ?? null;

  return (
    <DashboardLayout>
      <div className="min-h-full">
        {/* Photo-led header with a glass caption, matching the homepage signal cards. */}
        {/* Text beside the photo rather than over it: the photo is shown whole, at its own 3:2
            shape, so the rockfall onto the road is never cropped or covered. */}
        <header className="relative isolate overflow-hidden border-b border-border bg-gradient-to-br from-amber-50 via-surface to-sky-50">
          <div
            className="absolute -left-24 -top-24 -z-10 size-96 rounded-full bg-amber-200/30 blur-3xl"
            aria-hidden="true"
          />
          <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 py-6 sm:px-6 md:py-8 lg:grid-cols-[1fr_minmax(0,34rem)] lg:gap-10 lg:px-8">
            <div className="order-2 lg:order-1">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                <Route className="size-4" aria-hidden="true" /> Roads &amp; traffic
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Which roads are closed right now
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                Closures reported to PWD Uttarakhand by its divisions, PMGSY, BRO and NHIDCL,
                checked every ten minutes — and the highway network they sit on.
              </p>
            </div>
            <div className="relative order-1 aspect-[3/2] w-full overflow-hidden rounded-3xl bg-muted shadow-card ring-1 ring-black/5 lg:order-2">
              <Image
                src="/cards/roads-rockfall.jpg"
                alt="Rocks and dust sliding down a slope onto a mountain road"
                fill
                priority
                sizes="(min-width: 1024px) 34rem, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
          {counts !== null ? (
            <section aria-label="Closure summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                {
                  label: 'Closed now',
                  value: counts.closed,
                  icon: Construction,
                  tone: 'border-rose-200 bg-rose-50/80 text-rose-950',
                },
                {
                  label: 'Partially open',
                  value: counts.partiallyOpen,
                  icon: TriangleAlert,
                  tone: 'border-amber-200 bg-amber-50/80 text-amber-950',
                },
                {
                  label: 'Highways affected',
                  value: counts.highways,
                  icon: Route,
                  tone: 'border-sky-200 bg-sky-50/80 text-sky-950',
                },
                {
                  label: 'Reopened, last 24 h',
                  value: counts.reopened,
                  icon: RotateCcw,
                  tone: 'border-emerald-200 bg-emerald-50/80 text-emerald-950',
                },
              ].map((tile) => (
                <div key={tile.label} className={`rounded-2xl border p-4 ${tile.tone}`}>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] opacity-80">
                    <tile.icon className="size-4" aria-hidden="true" />
                    {tile.label}
                  </p>
                  <p className="mt-2 font-display text-3xl font-semibold tabular-nums">
                    {tile.value}
                  </p>
                </div>
              ))}
              {report?.checkedAt ? (
                <p className="col-span-2 text-xs text-muted-foreground lg:col-span-4">
                  As reported to PWD Uttarakhand, checked {formatIst(report.checkedAt)} IST.
                </p>
              ) : null}
            </section>
          ) : null}

          <section
            id="closures"
            aria-labelledby="closures-heading"
            className="scroll-mt-24 space-y-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="closures-heading" className="text-xl font-semibold tracking-tight">
                  Road closures{districtName !== undefined ? ` in ${districtName}` : ''}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  National and state highways first, then the newest closures.
                </p>
              </div>
              <Link
                href="/trip-check"
                className="inline-flex min-h-10 items-center gap-2 self-start rounded-full border border-border bg-surface px-4 text-sm font-semibold text-accent hover:bg-surface-hover"
              >
                <CalendarCheck className="size-4" aria-hidden="true" /> Check a whole trip
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            {report?.available ? (
              <nav aria-label="Filter closures" className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Chip href={filterHref(district, 'all')} active={type === 'all'}>
                    All roads
                  </Chip>
                  <Chip href={filterHref(district, 'highways')} active={type === 'highways'}>
                    Highways only
                  </Chip>
                </div>
                {districtOptions.length > 0 ? (
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    <Chip href={filterHref(undefined, type)} active={district === undefined}>
                      All districts
                    </Chip>
                    {districtOptions.map(([slug, name]) => (
                      <Chip key={slug} href={filterHref(slug, type)} active={district === slug}>
                        {name}
                      </Chip>
                    ))}
                  </div>
                ) : null}
              </nav>
            ) : null}

            <RoadClosuresPanel
              report={visible ?? null}
              now={now}
              showDistrict={district === undefined}
              scopeLabel={
                districtName ?? (type === 'highways' ? 'highways in Uttarakhand' : 'Uttarakhand')
              }
            />
          </section>

          <section aria-labelledby="network-heading" className="space-y-4">
            <div>
              <h2 id="network-heading" className="text-xl font-semibold tracking-tight">
                Highway network
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                The National (blue) and State (gold) highways drawn over the terrain. This map shows
                which highways exist, not whether they are open — for status, see the closures
                above.
              </p>
            </div>
            {networkError !== null ? (
              <p className="text-sm text-muted-foreground">
                Road network unavailable — {networkError}
              </p>
            ) : null}
            <HighwayExplorer network={network} districts={districts} />
            {attribution !== null ? (
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
                , read {attribution.vintage}. This is a crowd-sourced map, not an NHAI or PWD
                register — a highway may be missing or newly renumbered.
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
