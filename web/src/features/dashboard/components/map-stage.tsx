'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CloudSun, Landmark } from 'lucide-react';
import { TerrainMap } from '@/features/map';
import type { AlertCollection, DistrictCollection } from '@/features/map/schemas';
import type { LiveCounters as LiveCountersData, StateOverview } from '../types';
import NumberFlow from '@number-flow/react';

interface MapStageProps {
  districts: DistrictCollection | null;
  alerts: AlertCollection | null;
  counters: LiveCountersData;
  overview: StateOverview;
  mapError: string | null;
}

/**
 * The floating cards' background.
 *
 * `/95` rather than a heavy glass effect on purpose. These sit over hill terrain that runs
 * from near-white snow to dark forest, and a translucent card is legible over one and not
 * the other. The audience reads this projected in bright rooms, so contrast wins over the
 * frosted look — the blur is there only to soften the seam, not to show the map through.
 */
const FLOATING_CARD =
  'surface-card pointer-events-auto bg-white/70 dark:bg-black/60 backdrop-blur-[20px] backdrop-saturate-[180%] shadow-card ring-1 ring-white/20';

function Figure({ value, label, year, isNumeric = false }: { value: string | number | null; label: string; year?: string | null; isNumeric?: boolean }) {
  const isPop = label === 'Population';
  const isPercent = label === 'Forest cover' || label === 'Literacy';
  const isCompact = label === 'Population';
  
  return (
    <div>
      <p className="font-mono text-base font-semibold tabular-nums sm:text-xl">
        {isNumeric && typeof value === 'number' ? (
          <NumberFlow 
            value={value} 
            trend={1}
            format={{ 
              notation: isCompact ? 'compact' : 'standard', 
              maximumFractionDigits: isPop ? 1 : (isPercent ? 1 : 0),
              style: isPercent ? 'percent' : 'decimal'
            }}
            transformTiming={{ duration: 600, easing: 'ease-out' }}
            spinTiming={{ duration: 600, easing: 'ease-out' }}
          />
        ) : (
          value === null ? '—' : value
        )}
      </p>
      <p className="text-[0.62rem] leading-tight text-muted-foreground sm:text-[0.7rem]">{label}</p>
      {/* The vintage is dropped on a phone: four columns in 390px leaves ~80px each, and the
          year is the least load-bearing of the three lines. It returns from `sm`. */}
      {year != null && (
        <p className="hidden text-[0.62rem] text-muted-foreground/60 sm:block">{year}</p>
      )}
    </div>
  );
}

function year(figure: { vintage: string | null }): string | null {
  if (figure.vintage === null) return null;
  const value = figure.vintage.slice(0, 4);
  return /^\d{4}$/.test(value) ? value : null;
}



/**
 * The home dashboard's map stage.
 *
 * On large screens the map fills the viewport and the cards float over its corners. Below
 * `lg` that inverts completely and everything returns to normal document flow: the map
 * becomes a fixed-height block and the cards stack underneath it.
 *
 * That split is not a nicety. Floating translucent panels over a pannable map on a phone
 * means the cards cover most of the map AND steal the drag gestures needed to move it —
 * both halves become unusable at once. Most people reaching a state data portal are on a
 * phone, so the mobile layout is the one that has to be right.
 *
 * `pointer-events-none` on the overlay wrappers with `pointer-events-auto` on the cards
 * themselves keeps the map draggable in the gaps between them.
 */
export function MapStage({ districts, alerts, counters, overview, mapError }: MapStageProps) {
  const alertCount = counters.activeAlerts;

  return (
    <section
      aria-label="Uttarakhand overview map and live figures"
      className="relative h-[calc(100dvh-4rem)] lg:h-screen"
    >
      {mapError !== null && (
        <p className="mb-3 text-xs text-muted-foreground">Map data unavailable — {mapError}</p>
      )}

      <div className="absolute inset-0">
        <TerrainMap
          districts={districts}
          alerts={alerts}
          stage
          className="h-full rounded-none border-0"
        />
      </div>

      {/* Top-left: the headline figures. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-3 sm:p-4 lg:p-5">
        <div className={`${FLOATING_CARD} pp-rise p-2.5 sm:p-4 lg:max-w-md`}>
          {/* Hidden on a phone: the h1 below already says what this is, and on a 390px
              screen this eyebrow was costing a line of the map for no information. */}
          <p className="hidden text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground sm:block">
            Uttarakhand overview
          </p>
          {/* The page's only h1: the old page header was removed so the map could have the
              full viewport at every size. */}
          <h1 className="font-display text-base font-semibold leading-tight tracking-[-0.02em] text-text-light sm:mt-1 sm:text-xl lg:text-2xl">
            Uttarakhand, at a glance
          </h1>
          <div className="mt-1.5 grid grid-cols-4 gap-x-2 gap-y-1 sm:mt-3 sm:gap-3">
            <Figure
              value={overview.population.value}
              label="Population"
              year={year(overview.population)}
              isNumeric={true}
            />
            <Figure
              value={overview.districts.value}
              label="Districts"
              isNumeric={true}
            />
            <Figure value={alertCount} label="Active alerts" isNumeric={true} />
            <Figure
              value={overview.forestCoverage.value ? overview.forestCoverage.value / 100 : null}
              label="Forest cover"
              year={year(overview.forestCoverage)}
              isNumeric={true}
            />
          </div>
        </div>
      </div>

      {/* Bottom: the three things worth acting on. */}
      <div /**
         * `pointer-events-auto` below `lg`, and that is the fix for a real bug: this is a
         * horizontal scroller on a phone, and `pointer-events-none` meant it never received
         * the touch events needed to swipe it. The cards were tappable (they set
         * `pointer-events-auto` themselves) but the strip would not move, so only the first
         * card and a sliver of the second were ever reachable.
         *
         * From `lg` it becomes a three-column grid with gaps the map shows through, and
         * there `pointer-events-none` is right — it keeps the map draggable between cards.
         */
        className="pointer-events-auto absolute inset-x-0 bottom-0 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:p-4 lg:pointer-events-none lg:grid lg:max-w-[64rem] lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:p-5">
        {/* Alerts first, and styled to stand out when there are any. This is an emergency
            -facing product; the warning card is the one that must not blend in. */}
        <article
          className={`${FLOATING_CARD} pp-rise w-[78vw] shrink-0 snap-start p-4 sm:w-[52vw] lg:w-auto lg:shrink`}
          style={{ '--pp-delay': '80ms' } as React.CSSProperties}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle
                className={`size-4 ${alertCount > 0 ? 'text-danger' : 'text-muted-foreground'}`}
                strokeWidth={2}
                aria-hidden="true"
              />
              Live alerts
            </h2>
            <Link
              href="/alerts"
              className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              See all <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-3 font-mono text-3xl font-semibold tabular-nums">{alertCount}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {alertCount === 0
              ? 'No warnings currently in force across the state.'
              : `Warning${alertCount === 1 ? '' : 's'} in force. Shaded areas on the map show the districts affected.`}
          </p>
        </article>

        <article
          className={`${FLOATING_CARD} pp-rise w-[78vw] shrink-0 snap-start p-4 sm:w-[52vw] lg:w-auto lg:shrink`}
          style={{ '--pp-delay': '150ms' } as React.CSSProperties}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <CloudSun className="size-4 text-accent" strokeWidth={2} aria-hidden="true" />
              Weather &amp; air
            </h2>
            <Link
              href="/hydromet"
              className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              See all <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-text-light">
            Current conditions and air quality at every district headquarters, updated hourly.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Source named on every figure.
          </p>
        </article>

        <article
          className={`${FLOATING_CARD} pp-rise w-[78vw] shrink-0 snap-start p-4 sm:w-[52vw] lg:w-auto lg:shrink`}
          style={{ '--pp-delay': '220ms' } as React.CSSProperties}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Landmark className="size-4 text-accent" strokeWidth={2} aria-hidden="true" />
              State profile
            </h2>
            <Link
              href="/districts"
              className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Districts <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Figure
              value={overview.areaKmSq.value}
              label="km² area"
              year={year(overview.areaKmSq)}
              isNumeric={true}
            />
            <Figure
              value={overview.literacy.value ? overview.literacy.value / 100 : null}
              label="Literacy"
              year={year(overview.literacy)}
              isNumeric={true}
            />
            <Figure
              value={overview.villages.value}
              label="Villages"
              year={year(overview.villages)}
              isNumeric={true}
            />
          </div>
        </article>
      </div>
    </section>
  );
}
