'use client';

import React from 'react';
import {
  BookOpen,
  MapPinned,
  Mountain,
  Trees,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { StateFigure, StateOverview } from '../types';

interface StateOverviewCardProps {
  data: StateOverview;
  loading?: boolean;
}

interface OverviewItem {
  label: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
  /** The year the figure describes. Null when it is derived rather than published. */
  year: string | null;
  source: string | null;
}

/** The year a figure describes, for the caption under it. */
function vintageYear(figure: StateFigure): string | null {
  if (figure.vintage === null) return null;
  const year = figure.vintage.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : null;
}

/**
 * Formats a figure, or a dash when there is none.
 *
 * A missing figure renders as "—" and never as 0 or a placeholder number. The panel used to
 * have no way to express absence at all, which is why absent numbers were filled in by hand
 * — and two of the hand-filled ones matched nothing published.
 */
function format(figure: StateFigure, transform: (value: number) => string): string {
  return figure.value === null ? '—' : transform(figure.value);
}

export function StateOverviewCard({ data, loading }: StateOverviewCardProps) {
  const items: OverviewItem[] = [
    {
      label: 'Population',
      value: format(data.population, (value) => (value / 1_000_000).toFixed(1)),
      unit: data.population.value === null ? '' : 'M',
      icon: Users,
      year: vintageYear(data.population),
      source: data.population.sourceLabel,
    },
    {
      label: 'Area',
      value: format(data.areaKmSq, (value) => value.toLocaleString('en-IN')),
      unit: data.areaKmSq.value === null ? '' : 'km²',
      icon: Mountain,
      year: vintageYear(data.areaKmSq),
      source: data.areaKmSq.sourceLabel,
    },
    {
      label: 'Literacy rate',
      value: format(data.literacy, (value) => value.toFixed(2)),
      unit: data.literacy.value === null ? '' : '%',
      icon: BookOpen,
      year: vintageYear(data.literacy),
      source: data.literacy.sourceLabel,
    },
    {
      label: 'Districts',
      value: format(data.districts, (value) => value.toLocaleString('en-IN')),
      unit: '',
      icon: MapPinned,
      year: vintageYear(data.districts),
      source: data.districts.sourceLabel,
    },
    {
      label: 'Forest cover',
      value: format(data.forestCoverage, (value) => value.toFixed(2)),
      unit: data.forestCoverage.value === null ? '' : '%',
      icon: Trees,
      year: vintageYear(data.forestCoverage),
      source: data.forestCoverage.sourceLabel,
    },
    {
      label: 'Villages',
      value: format(data.villages, (value) => value.toLocaleString('en-IN')),
      unit: '',
      icon: Warehouse,
      year: vintageYear(data.villages),
      source: data.villages.sourceLabel,
    },
  ];

  return (
    <section
      className="surface-card h-full overflow-hidden"
      aria-labelledby="state-at-a-glance-heading"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            State profile
          </p>
          <h2 id="state-at-a-glance-heading" className="mt-1 text-xl font-semibold tracking-tight">
            Uttarakhand at a glance
          </h2>
        </div>
        {/* Counted, not written: this said "13 districts" as a literal, which would have
            gone stale silently if the state ever gained one. */}
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {data.districts.value === null ? 'Districts' : `${data.districts.value} districts`}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse bg-surface p-5">
              <div className="h-9 w-9 rounded-lg bg-muted" />
              <div className="mt-4 h-5 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="bg-surface p-5 sm:p-6">
                <Icon className="size-5 text-accent" strokeWidth={1.8} aria-hidden="true" />
                <dd className="mt-4 font-mono text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
                  {item.value}
                  {item.unit ? (
                    <span className="ml-1 text-sm font-medium text-muted-foreground">
                      {item.unit}
                    </span>
                  ) : null}
                </dd>
                <dt className="mt-1 text-xs text-muted-foreground sm:text-sm">{item.label}</dt>
                {/* The year belongs next to the number, not in a footnote. A 2011 census
                    figure and a 2019 forest assessment side by side with no dates is the
                    part that misleads — neither number is wrong, the silence about their
                    vintages is. */}
                {item.year !== null && (
                  <p
                    className="mt-1 text-[0.68rem] leading-tight text-muted-foreground/70"
                    title={item.source ?? undefined}
                  >
                    {item.year}
                  </p>
                )}
              </div>
            );
          })}
        </dl>
      )}

      {/* Named in full once, rather than repeated under every tile. */}
      <p className="border-t border-border px-5 py-3 text-[0.68rem] leading-relaxed text-muted-foreground/70 sm:px-6">
        {[...new Set(items.map((item) => item.source).filter((s): s is string => s !== null))].join(
          ' · '
        )}
      </p>
    </section>
  );
}
