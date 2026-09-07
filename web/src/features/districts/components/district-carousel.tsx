'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronLeft, ChevronRight, Droplets, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { landmarkFor } from '../landmarks';

export interface CarouselDistrict {
  id: number;
  slug: string;
  name: { en: string; hi: string };
  tehsils: number;
  villages: number;
  weather: {
    temperatureC: number | null;
    humidityPct: number | null;
    windKmh: number | null;
    condition: string | null;
    station: string;
  } | null;
}

/**
 * The image layer, with the gradient always beneath it.
 *
 * The gradient is not a placeholder that gets replaced — it stays underneath permanently and
 * the photograph paints over it. A missing or slow file is therefore an image that has not
 * arrived yet rather than a grey hole, and `onError` simply leaves the designed state in
 * place. No layout shift either way.
 *
 * There is deliberately NO opacity fade gated on `onLoad`. That is what hid every one of
 * these photographs: the browser finished loading them before React hydrated and attached
 * the handler, the `load` event had already fired and never fired again, so the images sat
 * in the DOM at `opacity-0` behind their gradients. Correct `srcSet`, invisible result.
 * Visibility must not depend on an event that can arrive before anyone is listening.
 */
function CardImage({ slug, alt }: { slug: string; alt: string }) {
  const landmark = landmarkFor(slug);
  const [failed, setFailed] = useState(false);

  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(150deg, ${landmark.gradient[0]}, ${landmark.gradient[1]})`,
        }}
      />
      {landmark.image !== '' && !failed && (
        /**
         * `next/image` rather than a bare <img>, for weight rather than convenience. The
         * source files run to 5.9 MB together — `dehradun.png` is 2.8 MB on its own,
         * a photograph saved as PNG — and the audience for this includes people on hill
         * mobile connections. Next re-encodes to WebP/AVIF and serves the size actually
         * being displayed, which takes that to a fraction without touching the originals.
         *
         * `sizes` has to describe the real card widths or Next ships the largest variant to
         * everyone and the optimisation is wasted.
         */
        <Image
          src={landmark.image}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 960px, (min-width: 640px) 68vw, 86vw"
          onError={() => {
            setFailed(true);
          }}
          className="object-cover"
        />
      )}
      {/* Reads bottom-up: the text sits on the dark end so it stays legible over any photo,
          which is the whole reason the fade exists rather than a flat scrim. */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/45 to-slate-950/10" />
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[0.62rem] uppercase tracking-wide text-white/55">
        {Icon !== undefined && <Icon className="size-3" strokeWidth={2} />}
        {label}
      </p>
      <p className="truncate font-mono text-sm font-semibold tabular-nums text-white sm:text-base">
        {value}
      </p>
    </div>
  );
}

function DistrictCard({
  district,
  active,
  focusable,
}: {
  district: CarouselDistrict;
  active: boolean;
  focusable: boolean;
}) {
  const landmark = landmarkFor(district.slug);
  const weather = district.weather;

  return (
    <Link
      href={`/districts/${district.slug}`}
      aria-label={`${district.name.en} district`}
      aria-hidden={focusable ? undefined : true}
      /**
       * 16:9 and as wide as the section allows, so the landmark photograph gets the room a
       * landscape shot needs. Inactive cards scale back and dim rather than hide, which is
       * what makes the row read as one strip you are looking along.
       */
      /**
       * The aspect changes with the width because 16:9 does not survive a phone: at 86vw on
       * a 390px screen the card is 335x189, which leaves 149px of usable height for roughly
       * 220px of content. Taller on a phone, widening to 16:9 once there is room for it.
       */
      className={`group relative block aspect-[4/5] w-[86vw] shrink-0 snap-center overflow-hidden rounded-3xl shadow-[0_6px_20px_rgba(15,23,42,0.13)] transition-[transform,opacity,box-shadow] duration-500 ease-out sm:aspect-[16/10] sm:w-[70vw] lg:aspect-[16/9] lg:w-[min(66rem,76vw)] ${
        active ? 'scale-100 opacity-100' : 'scale-[0.9] opacity-50 hover:opacity-75'
      }`}
      tabIndex={focusable ? 0 : -1}
    >
      <CardImage slug={district.slug} alt={`${landmark.name}, ${district.name.en}`} />

      {/* Landscape wants its content spread across the width, not stacked in a column:
          identity on the left, figures on the right, both sitting on the dark end of the
          fade. */}
      <div className="relative flex h-full flex-col justify-end p-4 sm:p-7 lg:p-9">
        <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-x-8">
          <div className="min-w-0">
            {/* The landmark's name is deliberately not printed on the card. The photograph
                is there to give the district a face, not to caption a viewpoint, and the
                eyebrow competed with the district name for the same glance. It survives in
                the image's alt text, where it describes the photograph for a screen reader
                without adding a second heading to the card. */}
            <h2 className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
              {district.name.en}
            </h2>
            <p className="text-sm text-white/70 sm:text-base">{district.name.hi}</p>

            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-white">
              View district
              <ArrowRight
                className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </div>

          <div className="flex items-end gap-4 sm:gap-7">
            {weather !== null && (
              <div className="shrink-0 text-left sm:text-right">
                <p className="font-mono text-3xl font-semibold leading-none text-white sm:text-5xl">
                  {weather.temperatureC === null ? '—' : `${weather.temperatureC.toFixed(0)}°`}
                </p>
                {weather.condition !== null && (
                  <p className="mt-1.5 text-xs text-white/70 sm:text-sm">{weather.condition}</p>
                )}
                <p className="text-[0.62rem] text-white/45">{weather.station}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-l border-white/20 pl-4 sm:gap-x-7 sm:gap-y-3 sm:pl-7">
              {weather !== null && (
                <>
                  <Metric
                    label="Humidity"
                    icon={Droplets}
                    value={
                      weather.humidityPct === null ? '—' : `${weather.humidityPct.toFixed(0)}%`
                    }
                  />
                  <Metric
                    label="Wind"
                    icon={Wind}
                    value={weather.windKmh === null ? '—' : `${weather.windKmh.toFixed(0)} km/h`}
                  />
                </>
              )}
              <Metric label="Tehsils" value={district.tehsils.toLocaleString('en-IN')} />
              <Metric label="Villages" value={district.villages.toLocaleString('en-IN')} />
            </div>
          </div>
        </div>

        {/* Named where the photograph is, not in a footer nobody reads. */}
        {landmark.credit !== null && (
          <p className="mt-3 text-[0.6rem] text-white/45">{landmark.credit}</p>
        )}
      </div>
    </Link>
  );
}

/**
 * An endless centre-focused district carousel.
 *
 * The list is rendered THREE times and the view sits in the middle copy. When a scroll
 * settles inside the first or last copy, `scrollLeft` jumps forward or back by exactly one
 * set width — the same card, at the same offset, so nothing moves on screen — and there is
 * always another copy in both directions. That is what makes it loop: there is no first or
 * last card to stop against, and it reads the same going left as going right.
 *
 * Native scroll-snap does the actual scrolling, so the browser keeps momentum, rubber-
 * banding, trackpad and touch. The buttons and arrow keys only scroll it, so every input
 * path ends in the same place.
 *
 * The reposition happens once the scroll has SETTLED, never mid-gesture: assigning
 * `scrollLeft` during an animating scroll cancels it, which would feel like the carousel
 * snatching the card away mid-swipe.
 */
export function DistrictCarousel({ districts }: { districts: CarouselDistrict[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setSize = districts.length;

  // Three copies. Looping needs one to be scrolled into from either direction.
  const slides = [...districts, ...districts, ...districts];

  /** Width of one full set, including the gap that follows each card. */
  const setWidth = useCallback((): number => {
    const track = trackRef.current;
    if (track === null || setSize === 0) return 0;

    const first = track.children[0] as HTMLElement | undefined;
    const second = track.children[1] as HTMLElement | undefined;
    if (first === undefined) return 0;

    const stride =
      second === undefined ? first.offsetWidth : second.offsetLeft - first.offsetLeft;
    return stride * setSize;
  }, [setSize]);

  /** The index in the tripled list currently nearest the centre. */
  const nearestSlide = useCallback((): number => {
    const track = trackRef.current;
    if (track === null) return 0;

    const centre = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    let smallest = Number.POSITIVE_INFINITY;

    for (const [index, child] of [...track.children].entries()) {
      const element = child as HTMLElement;
      const distance = Math.abs(element.offsetLeft + element.offsetWidth / 2 - centre);
      if (distance < smallest) {
        smallest = distance;
        nearest = index;
      }
    }
    return nearest;
  }, []);

  const scrollToSlide = useCallback((index: number, smooth: boolean) => {
    const track = trackRef.current;
    if (track === null) return;

    const target = track.children[index] as HTMLElement | undefined;
    if (target === undefined) return;

    track.scrollTo({
      left: target.offsetLeft - (track.clientWidth - target.offsetWidth) / 2,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // Start in the middle copy so there is a full set of cards in both directions.
  useEffect(() => {
    if (setSize === 0) return;
    const frame = requestAnimationFrame(() => {
      scrollToSlide(setSize, false);
      setActiveIndex(0);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [setSize, scrollToSlide]);

  useEffect(() => {
    const track = trackRef.current;
    if (track === null || setSize === 0) return undefined;

    const onScroll = () => {
      setActiveIndex(nearestSlide() % setSize);

      if (settleTimer.current !== null) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => {
        const width = setWidth();
        if (width === 0) return;

        // Silent reposition: one set width lands on the identical card at the identical
        // offset, so this is invisible — it only restores a full copy on each side.
        if (track.scrollLeft < width * 0.5) {
          track.scrollLeft += width;
        } else if (track.scrollLeft > width * 1.5) {
          track.scrollLeft -= width;
        }
      }, 140);
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    };
  }, [nearestSlide, setWidth, setSize]);

  // Never clamped: stepping past either end simply moves into the neighbouring copy.
  const step = useCallback(
    (delta: number) => {
      scrollToSlide(nearestSlide() + delta, true);
    },
    [nearestSlide, scrollToSlide]
  );


  return (
    <div className="relative">
      <div
        ref={trackRef}
        role="group"
        aria-roledescription="carousel"
        aria-label="Districts of Uttarakhand"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            step(1);
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            step(-1);
          }
        }}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50%-43vw)] py-7 [scrollbar-width:none] focus:outline-none sm:gap-6 sm:px-[calc(50%-35vw)] lg:px-[max(calc(50%-33rem),calc(50%-38vw))] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((district, index) => (
          <DistrictCard
            key={`${Math.floor(index / setSize)}-${district.id}`}
            district={district}
            active={index % setSize === activeIndex}
            /* Only the middle copy is reachable by keyboard; the others are the same
               districts again and would triple the tab stops for no benefit. */
            focusable={index === activeIndex + setSize}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          step(-1);
        }}
        aria-label="Previous district"
        className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/90 shadow-card backdrop-blur transition hover:bg-surface sm:flex"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => {
          step(1);
        }}
        aria-label="Next district"
        className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/90 shadow-card backdrop-blur transition hover:bg-surface sm:flex"
      >
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>


      <p aria-live="polite" className="sr-only">
        {districts[activeIndex]?.name.en} district, {activeIndex + 1} of {districts.length}
      </p>
    </div>
  );
}
