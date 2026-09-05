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
import type { StateOverview } from '../types';

interface StateOverviewCardProps {
  data: StateOverview;
  loading?: boolean;
}

interface OverviewItem {
  label: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
}

export function StateOverviewCard({ data, loading }: StateOverviewCardProps) {
  const items: OverviewItem[] = [
    {
      label: 'Population',
      value: (data.population / 1_000_000).toFixed(1),
      unit: 'M',
      icon: Users,
    },
    { label: 'Area', value: data.areaKmSq.toLocaleString('en-IN'), unit: 'km²', icon: Mountain },
    { label: 'Literacy rate', value: data.literacy, unit: '%', icon: BookOpen },
    { label: 'Districts', value: data.districts, unit: '', icon: MapPinned },
    { label: 'Forest coverage', value: data.forestCoverage, unit: '%', icon: Trees },
    { label: 'Villages', value: data.villages.toLocaleString('en-IN'), unit: '', icon: Warehouse },
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
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          13 districts
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
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}
