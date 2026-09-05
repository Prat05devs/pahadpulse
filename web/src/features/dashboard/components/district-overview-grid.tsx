'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Bell, Users } from 'lucide-react';
import type { DistrictSummary } from '../types';

interface DistrictOverviewGridProps {
  districts: DistrictSummary[];
  loading?: boolean;
}

export function DistrictOverviewGrid({ districts, loading }: DistrictOverviewGridProps) {
  return (
    <section aria-labelledby="districts-heading">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Across the state
          </p>
          <h2 id="districts-heading" className="mt-1 text-xl font-semibold tracking-tight">
            All 13 districts
          </h2>
        </div>
        <Link
          href="/districts"
          className="flex min-h-11 items-center gap-2 rounded-md px-1 text-sm font-semibold text-accent"
        >
          View all <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Loading districts"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="surface-card h-40 animate-pulse p-5">
              <div className="h-5 w-1/2 rounded bg-muted" />
              <div className="mt-3 h-4 w-1/3 rounded bg-muted" />
              <div className="mt-7 h-8 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {districts.map((district) => (
            <li key={district.id}>
              <Link
                href={`/districts/${district.slug}`}
                className="surface-card interactive-card group block min-h-40 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold tracking-tight">{district.name}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{district.nameHi}</p>
                  </div>
                  <ArrowRight
                    className="mt-1 size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
                <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="size-3.5" aria-hidden="true" /> Population
                    </dt>
                    <dd className="mt-1 font-mono font-semibold tabular-nums">
                      {district.population > 0
                        ? `${(district.population / 100_000).toFixed(1)} lakh`
                        : '—'}
                    </dd>
                    {/* The year is part of the figure, not a footnote. A 2011 census count
                        shown bare reads as today's population, which it is not. */}
                    {district.population > 0 && district.populationVintage !== null && (
                      <dd className="mt-0.5 text-[11px] text-muted-foreground">
                        Census {district.populationVintage.slice(0, 4)}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Bell className="size-3.5" aria-hidden="true" /> Alerts
                    </dt>
                    <dd
                      className={`mt-1 font-mono font-semibold tabular-nums ${district.activeAlerts > 0 ? 'text-danger' : 'text-success'}`}
                    >
                      {district.activeAlerts > 0 ? `${district.activeAlerts} active` : 'None'}
                    </dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
