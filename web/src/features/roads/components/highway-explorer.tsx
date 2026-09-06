'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TerrainMap } from '@/features/map';
import { ROAD_COLORS } from '@/features/map/constants';
import type { DistrictCollection } from '@/features/map/schemas';
import type { RoadNetwork, RoadRoute } from '../schemas';

interface HighwayExplorerProps {
  network: RoadNetwork | null;
  districts: DistrictCollection | null;
}

function HighwayList({
  title,
  subtitle,
  routes,
  color,
  selectedRef,
  onSelect,
}: {
  title: string;
  subtitle: string;
  routes: RoadRoute[];
  color: string;
  selectedRef: string | null;
  onSelect: (route: RoadRoute) => void;
}) {
  return (
    <section className="surface-card pp-rise p-4 sm:p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span
              className="inline-block h-1 w-6 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
          {routes.length}
        </span>
      </div>

      {routes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No routes recorded.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {routes.map((route, index) => {
            const isSelected = selectedRef === route.ref;
            return (
              // Staggered fade rather than rise: these are small chips in a wrap-flow, and
              // vertical movement across several rows reads as jitter rather than order.
              <li
                key={route.ref}
                className="pp-fade"
                style={{ '--pp-delay': `${Math.min(index * 18, 420)}ms` } as React.CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelect(route);
                  }}
                  aria-pressed={isSelected}
                  title={`${route.ref} — ${route.segmentCount} tagged segment(s) in Uttarakhand`}
                  className="rounded-md border px-2.5 py-1.5 font-mono text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  style={
                    isSelected
                      ? { backgroundColor: color, borderColor: color, color: '#fff' }
                      : undefined
                  }
                >
                  <span className={isSelected ? '' : 'text-text-light'}>{route.ref}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * The highway list and the map, wired together.
 *
 * Client-side because selection is transient view state — which highway you are looking at
 * is not worth a URL or a round trip, unlike the district comparison where the selection is
 * the result someone might cite.
 */
export function HighwayExplorer({ network, districts }: HighwayExplorerProps) {
  const [selected, setSelected] = useState<RoadRoute | null>(null);

  const select = (route: RoadRoute) => {
    // Clicking the selected highway again clears it — the only way back to the whole
    // network without hunting for a separate reset control.
    setSelected((current) => (current?.ref === route.ref ? null : route));
  };

  return (
    <div className="space-y-4">
      {districts !== null && (
        <div className="relative">
          <TerrainMap
            districts={districts}
            alerts={null}
            highlightRoads
            navigateOnClick={false}
            selectedRoadRef={selected?.ref ?? null}
            selectedRoadBounds={selected?.bounds ?? null}
            className="h-[440px] sm:h-[540px] lg:h-[600px]"
          />

          {selected !== null && (
            <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-surface/95 py-1.5 pl-4 pr-1.5 shadow-card backdrop-blur">
              <span className="font-mono text-sm font-semibold">{selected.ref}</span>
              <span className="text-xs text-muted-foreground">
                {selected.segmentCount} segment{selected.segmentCount === 1 ? '' : 's'} in state
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                }}
                aria-label="Show the whole highway network"
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-hover hover:text-text-light"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}

      {network !== null && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <HighwayList
            title="National Highways (NH)"
            subtitle="Major routes through Uttarakhand"
            routes={network.national}
            color={ROAD_COLORS.NH}
            selectedRef={selected?.ref ?? null}
            onSelect={select}
          />
          <HighwayList
            title="State Highways (SH)"
            subtitle="Regional connectivity"
            routes={network.state}
            color={ROAD_COLORS.SH}
            selectedRef={selected?.ref ?? null}
            onSelect={select}
          />
        </div>
      )}
    </div>
  );
}
