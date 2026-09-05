'use client';

import React from 'react';
import { AlertTriangle, Route, Signal, Users, type LucideIcon } from 'lucide-react';
import type { LiveCounters } from '../types';

interface LiveCountersProps {
  data: LiveCounters;
  loading?: boolean;
  /**
   * `grid` spreads the four counters across the page. `rail` stacks them in a column beside
   * the map, where they read as a running tally of what the map is showing rather than as a
   * separate section — which is why the rail variant drops the section heading.
   */
  orientation?: 'grid' | 'rail';
}

interface Counter {
  label: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
  tone: string;
  iconTone: string;
}

export function LiveCounters({ data, loading, orientation = 'grid' }: LiveCountersProps) {
  const isRail = orientation === 'rail';
  const counters: Counter[] = [
    {
      label: 'Tourists in state',
      value: data.touristsInState.toLocaleString('en-IN'),
      unit: 'people today',
      icon: Users,
      tone: 'bg-info-soft',
      iconTone: 'text-info',
    },
    {
      label: 'Active alerts',
      value: data.activeAlerts,
      unit: 'across the state',
      icon: AlertTriangle,
      tone: 'bg-danger-soft',
      iconTone: 'text-danger',
    },
    {
      label: 'Closed roads',
      value: data.closedRoads,
      unit: 'reported segments',
      icon: Route,
      tone: 'bg-warning-soft',
      iconTone: 'text-warning',
    },
    {
      label: 'Connectivity',
      value: `${data.connectivityPercentage}%`,
      unit: 'areas online',
      icon: Signal,
      tone: 'bg-success-soft',
      iconTone: 'text-success',
    },
  ];

  return (
    <section
      aria-labelledby="live-overview-heading"
      className={isRail ? 'flex h-full flex-col' : undefined}
    >
      <div className={`mb-4 flex items-end justify-between gap-4 ${isRail ? 'sr-only' : ''}`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Current pulse
          </p>
          <h2 id="live-overview-heading" className="mt-1 text-xl font-semibold tracking-tight">
            Live state overview
          </h2>
        </div>
        <p className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <span className="size-2 rounded-full bg-success" aria-hidden="true" />
          Latest available data
        </p>
      </div>

      <div
        className={
          isRail
            ? 'grid flex-1 grid-cols-2 gap-3 lg:grid-cols-1 lg:grid-rows-4'
            : 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'
        }
      >
        {counters.map((counter) => {
          const Icon = counter.icon;

          return (
            <article
              key={counter.label}
              className={`surface-card overflow-hidden ${
                isRail ? 'flex flex-col justify-center p-3.5' : 'p-5'
              }`}
            >
              {loading ? (
                <div className="animate-pulse space-y-3" aria-label={`Loading ${counter.label}`}>
                  <div className="h-10 w-10 rounded-lg bg-muted" />
                  <div className="h-8 w-3/4 rounded bg-muted" />
                  <div className="h-4 w-1/2 rounded bg-muted" />
                </div>
              ) : (
                <>
                  <div
                    className={`flex items-center justify-center rounded-lg ${
                      isRail ? 'size-9' : 'size-10'
                    } ${counter.tone} ${counter.iconTone}`}
                  >
                    <Icon
                      className={isRail ? 'size-4.5' : 'size-5'}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </div>
                  <p
                    className={`font-mono font-semibold tracking-tight tabular-nums ${
                      isRail ? 'mt-2 text-xl' : 'mt-5 text-2xl'
                    }`}
                  >
                    {counter.value}
                  </p>
                  <p className={`mt-1 font-medium ${isRail ? 'text-[13px]' : 'text-sm'}`}>
                    {counter.label}
                  </p>
                  <p
                    className={`mt-0.5 text-muted-foreground ${
                      isRail ? 'text-[11px]' : 'text-xs'
                    }`}
                  >
                    {counter.unit}
                  </p>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
