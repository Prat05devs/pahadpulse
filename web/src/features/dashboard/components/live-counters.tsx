'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeIndianRupee,
  Landmark,
  MountainSnow,
  Route,
  Signal,
  type LucideIcon,
} from 'lucide-react';

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
  icon: LucideIcon;
  tone: string;
  iconTone: string;
}

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
      icon: MountainSnow,
      tone: 'bg-info-soft',
      iconTone: 'text-info',
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
      icon: AlertTriangle,
      tone: 'bg-danger-soft',
      iconTone: 'text-danger',
    },
    {
      label: 'Road closure coverage',
      value: 'Not tracked',
      period: 'No verified live feed',
      context: 'The platform maps highway references but does not invent a closure count',
      href: '/roads',
      linkLabel: 'Road network',
      badge: 'Coverage gap',
      icon: Route,
      tone: 'bg-warning-soft',
      iconTone: 'text-warning',
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
      icon: Signal,
      tone: 'bg-success-soft',
      iconTone: 'text-success',
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
      icon: Landmark,
      tone: 'bg-info-soft',
      iconTone: 'text-info',
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
      icon: BadgeIndianRupee,
      tone: 'bg-success-soft',
      iconTone: 'text-success',
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
          Every card states its period and scope. Annual totals are never presented as live occupancy.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {counters.map((counter, index) => {
          const Icon = counter.icon;

          return (
            <Link
              key={counter.label}
              href={counter.href}
              className="surface-card pp-rise group flex min-h-60 flex-col overflow-hidden p-5 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              style={{ '--pp-delay': `${index * 45}ms` } as React.CSSProperties}
            >
              {loading ? (
                <div className="animate-pulse space-y-3" aria-label={`Loading ${counter.label}`}>
                  <div className="h-10 w-10 rounded-lg bg-muted" />
                  <div className="h-8 w-3/4 rounded bg-muted" />
                  <div className="h-4 w-1/2 rounded bg-muted" />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex size-10 items-center justify-center rounded-lg ${counter.tone} ${counter.iconTone}`}>
                      <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {counter.badge}
                    </span>
                  </div>
                  <p className="mt-5 font-mono text-2xl font-semibold tracking-tight tabular-nums text-text-light">
                    {counter.value}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-text-light">{counter.label}</h3>
                  <p className="mt-1 text-xs font-medium text-accent">{counter.period}</p>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {counter.context}
                  </p>
                  <span className="mt-4 inline-flex min-h-11 items-center gap-1.5 border-t border-border pt-3 text-sm font-semibold text-accent">
                    {counter.linkLabel}
                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
