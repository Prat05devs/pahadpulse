'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { formatCrore } from '@/features/governance/format';
import type { LiveCounters } from '../types';

interface LiveCountersProps {
  data: LiveCounters;
  loading?: boolean;
}

interface Counter {
  label: string;
  value: string;
  period: string;
  context: string;
  href: string;
  linkLabel: string;
  badge: string;
  image: string;
  /** Text colour for the glass panel, chosen per photo: dark ink over bright images, light over dark. */
  ink: 'dark' | 'light';
  /** A faint tint on the glass, so each signal keeps its own identity. */
  glassTone: string;
  periodTone: string;
}

const INK = {
  dark: {
    label: 'text-slate-700',
    value: 'text-slate-950',
    context: 'text-slate-800',
    shadow: '[text-shadow:0_1px_1px_rgb(255_255_255/0.5)]',
  },
  light: {
    label: 'text-white/85',
    value: 'text-white',
    context: 'text-white/90',
    shadow: '[text-shadow:0_1px_2px_rgb(0_0_0/0.45)]',
  },
} as const;

function quarter(value: string | null): string {
  if (value === null) return 'Quarter unavailable';
  const [year, month] = value.split('-').map(Number);
  if (year === undefined || month === undefined || Number.isNaN(year) || Number.isNaN(month)) {
    return value;
  }
  return `Q${Math.floor((month - 1) / 3) + 1} ${year}`;
}

export function LiveCounters({ data, loading }: LiveCountersProps) {
  const counters: Counter[] = [
    {
      label: 'Pilgrim arrivals',
      value:
        data.pilgrimArrivals.value === null
          ? '—'
          : data.pilgrimArrivals.value.toLocaleString('en-IN'),
      period:
        data.pilgrimArrivals.year === null
          ? 'Completed year unavailable'
          : `${data.pilgrimArrivals.year} annual total`,
      context:
        data.pilgrimArrivals.destinationCount === 0
          ? 'Published destination counts'
          : `Across ${data.pilgrimArrivals.destinationCount} reporting destinations · not people currently in the state`,
      href: '/tourism',
      linkLabel: 'Tourism history',
      badge: 'Annual',
      image: '/cards/tourism.webp',
      ink: 'dark',
      glassTone: 'bg-sky-50/40',
      periodTone: 'text-sky-800',
    },
    {
      label: 'Active public alerts',
      value: data.activeAlerts === null ? '—' : data.activeAlerts.toLocaleString('en-IN'),
      period: 'Current feed',
      context:
        data.activeAlerts === null
          ? 'The live count is temporarily unavailable'
          : data.activeAlerts === 0
            ? 'No warnings currently in force across the state'
            : `${data.activeAlerts} warning${data.activeAlerts === 1 ? '' : 's'} currently in force`,
      href: '/alerts',
      linkLabel: 'Open alerts',
      badge: 'Live',
      image: '/cards/alerts.webp',
      ink: 'light',
      glassTone: 'bg-slate-900/20',
      periodTone: 'text-rose-200',
    },
    {
      label: 'Road closure coverage',
      value: 'Not tracked',
      period: 'No verified live feed',
      context: 'The platform maps highway references but does not invent a closure count',
      href: '/roads',
      linkLabel: 'Road network',
      badge: 'Coverage gap',
      image: '/cards/roads.jpg',
      ink: 'dark',
      glassTone: 'bg-amber-50/40',
      periodTone: 'text-amber-900',
    },
    {
      label: 'Mobile download',
      value:
        data.connectivity.mobileDownloadMbps === null
          ? '—'
          : `${data.connectivity.mobileDownloadMbps.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Mbps`,
      period: quarter(data.connectivity.quarterStart),
      context:
        data.connectivity.districtsMeasured === 0
          ? 'No district measurements available'
          : `Test-weighted state average · ${data.connectivity.districtsMeasured} districts measured`,
      href: '/connectivity',
      linkLabel: 'Compare speeds',
      badge: 'Quarterly',
      image: '/cards/connectivity.webp',
      ink: 'light',
      glassTone: 'bg-slate-900/15',
      periodTone: 'text-teal-200',
    },
    {
      label: 'State budget estimate',
      value: data.budget.total === null ? '—' : formatCrore(data.budget.total),
      period:
        data.budget.fiscalYear === null
          ? 'Financial year unavailable'
          : `FY ${data.budget.fiscalYear}`,
      context:
        data.budget.yearsAvailable === 0
          ? 'Official budget data unavailable'
          : `${data.budget.yearsAvailable}-year official archive · allocation, not actual spending`,
      href: '/governance#budget-allocation-heading',
      linkLabel: 'Explore budget',
      badge: 'Estimate',
      image: '/cards/budget.jpeg',
      ink: 'light',
      glassTone: 'bg-fuchsia-950/15',
      periodTone: 'text-violet-200',
    },
    {
      label: 'Startup support schemes',
      value:
        data.startupSchemes.verifiedCount === 0
          ? '—'
          : data.startupSchemes.verifiedCount.toLocaleString('en-IN'),
      period:
        data.startupSchemes.verifiedOn === null
          ? 'Verification date unavailable'
          : `Verified ${data.startupSchemes.verifiedOn}`,
      context:
        data.startupSchemes.verifiedCount === 0
          ? 'Scheme directory temporarily unavailable'
          : 'Central startup and MSME support with live-access caveats and official application routes',
      href: '/compare#schemes',
      linkLabel: 'Find support',
      badge: 'Verified',
      image: '/cards/schemes.avif',
      ink: 'dark',
      glassTone: 'bg-emerald-50/40',
      periodTone: 'text-emerald-800',
    },
  ];

  return (
    <section aria-labelledby="live-overview-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Latest published and live signals
          </p>
          <h2 id="live-overview-heading" className="mt-1 text-xl font-semibold tracking-tight">
            State data snapshot
          </h2>
        </div>
        <p className="max-w-lg text-xs leading-relaxed text-muted-foreground sm:text-right">
          Every card states its period and scope. Annual totals are never presented as live
          occupancy.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {counters.map((counter, index) => {
          return (
            <Link
              key={counter.label}
              href={counter.href}
              className="pp-rise group relative isolate flex min-h-64 flex-col overflow-hidden rounded-2xl border border-white/70 bg-muted p-2 shadow-[0_6px_24px_rgb(15_23_42/0.08)] transition-[transform,box-shadow] duration-200 active:scale-[0.985] hover:shadow-[0_12px_32px_rgb(15_23_42/0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              style={{ '--pp-delay': `${index * 45}ms` } as React.CSSProperties}
            >
              <Image
                src={counter.image}
                alt=""
                fill
                sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
                className="-z-10 object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-full border border-white/60 bg-white/75 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-slate-900 shadow-sm backdrop-blur-md">
                  {counter.badge}
                </span>
                <span className="flex size-8 items-center justify-center rounded-full border border-white/60 bg-white/75 text-slate-900 shadow-sm backdrop-blur-md transition-colors group-hover:bg-white">
                  <ArrowUpRight
                    className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                  <span className="sr-only">{counter.linkLabel}</span>
                </span>
              </div>
              {/* The photo is the card; the glass is only a slim caption strip along the bottom,
                  with ink matched to each photo's brightness so the text stays readable. */}
              <div
                className={`mt-auto rounded-xl px-3.5 py-2.5 ring-1 ring-inset ring-white/40 backdrop-blur-lg backdrop-saturate-150 ${counter.glassTone} ${INK[counter.ink].shadow}`}
              >
                {loading ? (
                  <div className="animate-pulse space-y-2" aria-label={`Loading ${counter.label}`}>
                    <div className="h-3 w-28 rounded bg-white/60" />
                    <div className="h-6 w-3/4 rounded bg-white/60" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3
                        className={`truncate text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${INK[counter.ink].label}`}
                      >
                        {counter.label}
                      </h3>
                      <p className={`shrink-0 text-[0.68rem] font-semibold ${counter.periodTone}`}>
                        {counter.period}
                      </p>
                    </div>
                    <p
                      className={`mt-0.5 font-mono text-xl font-semibold tracking-tight tabular-nums ${INK[counter.ink].value}`}
                    >
                      {counter.value}
                    </p>
                    <p
                      className={`mt-0.5 line-clamp-2 text-[0.7rem] leading-4 ${INK[counter.ink].context}`}
                    >
                      {counter.context}
                    </p>
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
