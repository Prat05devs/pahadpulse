import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  HeartPulse,
  Map,
  MapPin,
  MountainSnow,
  Navigation,
  Phone,
  Route,
  ShieldCheck,
} from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { fetchTourismOverview } from '@/features/tourism/services';
import { PilgrimArrivalsTable } from '@/features/tourism/components/pilgrim-arrivals-table';
import { TourismMap } from '@/features/tourism/components/tourism-map';
import type { PilgrimArrivals } from '@/features/tourism/pilgrim-schemas';

export const metadata = buildPageMetadata({
  title: 'Char Dham Yatra & Uttarakhand Travel Guide',
  description:
    'Plan a Char Dham journey with official registration, routes, visitor history, safety guidance and trusted Uttarakhand destinations.',
  path: '/tourism',
  keywords: ['Char Dham Yatra', 'Kedarnath route', 'Badrinath travel', 'Uttarakhand tourism'],
});

// Do not prerender an error page when the API is unavailable during deployment. The data
// fetch itself remains cached for 24 hours, so request-time rendering does not multiply DB work.
export const dynamic = 'force-dynamic';

const formatNumber = (value: number) => value.toLocaleString('en-IN');
const directionsUrl = (destination: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;

function selectCharDham(data: PilgrimArrivals): PilgrimArrivals {
  const destinations = data.destinations.filter((destination) => destination.type === 'char_dham');
  const years = [
    ...new Set(destinations.flatMap((destination) => destination.years.map((row) => row.year))),
  ].sort((a, b) => a - b);
  return {
    destinations,
    years,
    totals: years.map((year) => ({
      year,
      visitors: destinations.reduce(
        (sum, destination) =>
          sum + (destination.years.find((entry) => entry.year === year)?.visitors ?? 0),
        0
      ),
    })),
  };
}

export default async function TourismPage() {
  let overview = null;
  let error: string | null = null;
  try {
    overview = await fetchTourismOverview();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Tourism information is unavailable';
  }

  const guide = overview?.guide;
  const arrivals = overview ? selectCharDham(overview.arrivals) : null;
  const latest = arrivals?.totals.at(-1);
  const previous = arrivals?.totals.at(-2);
  const change =
    latest && previous ? ((latest.visitors - previous.visitors) / previous.visitors) * 100 : null;
  const hero = guide?.charDham.find((place) => place.slug === 'kedarnath');

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#f5f7f4] dark:bg-bg-light">
        {guide && hero ? (
          <>
            <section className="relative isolate overflow-hidden bg-slate-950 text-white">
              <Image
                src={hero.imageUrl}
                alt={hero.imageAlt}
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/65 to-slate-900/10" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/20" />
              <div className="relative mx-auto flex min-h-svh max-w-7xl flex-col justify-end px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
                <div className="mb-8 max-w-3xl sm:mb-10">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
                    <MountainSnow className="size-4" aria-hidden="true" /> Uttarakhand pilgrimage
                    planner
                  </p>
                  <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl">
                    Four sacred journeys.
                    <br />
                    One trusted guide.
                  </h1>
                  <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
                    Plan Yamunotri, Gangotri, Kedarnath and Badrinath with official registration,
                    practical routes and published visitor history—without mistaking annual totals
                    for live crowds.
                  </p>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <a
                      href="https://registrationandtouristcare.uk.gov.in/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 text-sm font-semibold text-white shadow-lg transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      Register on official portal{' '}
                      <ExternalLink className="size-4" aria-hidden="true" />
                    </a>
                    <a
                      href="#char-dham"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/35 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                    >
                      Explore the four dhams <ArrowRight className="size-4" aria-hidden="true" />
                    </a>
                  </div>
                  <p className="mt-4 text-xs text-slate-300">
                    Official yatra help: {guide.helplines.yatra.join(' · ')} · Emergency:{' '}
                    {guide.helplines.emergency}
                  </p>
                </div>

                <section aria-labelledby="trip-desk-heading" className="grid gap-3 sm:grid-cols-3">
                  {[
                    [
                      ShieldCheck,
                      'Register first',
                      'Pilgrim and vehicle registration belongs on the official Tourist Care portal.',
                      'text-success',
                    ],
                    [
                      Route,
                      'Recheck the route',
                      'Verify road, weather and health advisories again on your travel day.',
                      'text-accent',
                    ],
                    [
                      HeartPulse,
                      'Respect altitude',
                      'Build in acclimatisation time and seek medical guidance when relevant.',
                      'text-danger',
                    ],
                  ].map(([Icon, title, copy, tone]) => {
                    const CardIcon = Icon as typeof ShieldCheck;
                    return (
                      <article
                        key={String(title)}
                        className="rounded-xl border border-white/25 bg-white/95 p-5 text-slate-950 shadow-xl backdrop-blur-sm dark:bg-slate-950/90 dark:text-white"
                      >
                        <CardIcon className={`size-5 ${tone}`} aria-hidden="true" />
                        <h2
                          id={title === 'Register first' ? 'trip-desk-heading' : undefined}
                          className="mt-3 font-semibold"
                        >
                          {String(title)}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {String(copy)}
                        </p>
                      </article>
                    );
                  })}
                </section>
              </div>
            </section>

            <div className="mx-auto max-w-7xl space-y-16 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
              <section id="char-dham" aria-labelledby="char-dham-heading">
                <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                      The sacred circuit
                    </p>
                    <h2
                      id="char-dham-heading"
                      className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl"
                    >
                      Meet the four dhams
                    </h2>
                  </div>
                  <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                    Directions open a route from your location. For trekking shrines, they lead to
                    the practical road head.
                  </p>
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  {guide.charDham.map((place, index) => (
                    <article
                      key={place.slug}
                      className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
                    >
                      <div className="relative aspect-[16/9] overflow-hidden">
                        <Image
                          src={place.imageUrl}
                          alt={place.imageAlt}
                          fill
                          sizes="(min-width: 1024px) 50vw, 100vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.025]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 text-white">
                          <div>
                            <p className="text-xs font-medium text-white/70">
                              0{index + 1} · {place.district}
                            </p>
                            <h3 className="mt-1 font-display text-3xl font-semibold">
                              {place.name}
                            </h3>
                            <p lang="hi" className="text-sm text-white/80">
                              {place.nameHi}
                            </p>
                          </div>
                          <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur">
                            {formatNumber(place.altitudeM)} m
                          </span>
                        </div>
                      </div>
                      <div className="p-5 sm:p-6">
                        <div className="flex items-start gap-3 text-sm">
                          <CalendarDays
                            className="mt-0.5 size-4 shrink-0 text-accent"
                            aria-hidden="true"
                          />
                          <div>
                            <p className="font-medium">Typical visiting season</p>
                            <p className="mt-0.5 text-muted-foreground">{place.bestSeason}</p>
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-muted-foreground">
                          {place.access}
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                          <a
                            href={directionsUrl(place.mapDestination)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
                          >
                            <Navigation className="size-4" aria-hidden="true" /> Directions
                          </a>
                          <a
                            href={place.officialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-surface-hover"
                          >
                            Official guide <ExternalLink className="size-4" aria-hidden="true" />
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section aria-labelledby="tourism-map-heading">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    See the journey
                  </p>
                  <h2 id="tourism-map-heading" className="mt-2 font-display text-3xl font-semibold">
                    Sacred places and mountain escapes on the map
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    The two views share one efficient map renderer. Image markers identify each
                    place; directions open from your current starting point in a new Google Maps
                    tab.
                  </p>
                </div>
                <TourismMap guide={guide} />
              </section>

              <section aria-labelledby="pilgrimage-heading">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    Garhwal &amp; Kumaon
                  </p>
                  <h2 id="pilgrimage-heading" className="mt-2 font-display text-3xl font-semibold">
                    More major pilgrimage places
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    A curated starting point from the official Uttarakhand Tourism destination and
                    circuit pages. Remote routes still require a same-day local advisory.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {guide.pilgrimages.map((place) => (
                    <article
                      key={place.slug}
                      className="group overflow-hidden rounded-xl border border-border bg-surface"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <Image
                          src={place.imageUrl}
                          alt={`${place.name}, Uttarakhand`}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                          {place.category}
                        </span>
                      </div>
                      <div className="p-5">
                        <h3 className="font-display text-xl font-semibold">{place.name}</h3>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" aria-hidden="true" />
                          {place.district}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {place.summary}
                        </p>
                        <div className="mt-4 flex gap-4 text-sm font-semibold">
                          <a
                            href={directionsUrl(place.mapDestination)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent hover:underline"
                          >
                            Directions
                          </a>
                          <a
                            href={place.officialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-text-light"
                          >
                            Official page
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              {arrivals && latest ? (
                <section
                  aria-labelledby="arrivals-heading"
                  className="rounded-2xl bg-slate-950 px-4 py-7 text-white sm:p-8"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                        Published visitor history
                      </p>
                      <h2
                        id="arrivals-heading"
                        className="mt-2 font-display text-3xl font-semibold"
                      >
                        Char Dham arrivals, not live occupancy
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        These are completed annual destination counts published by Uttarakhand
                        Tourism. One person may visit multiple shrines, so the total is visits
                        across the four dhams—not unique people currently in the state.
                      </p>
                    </div>
                    <div className="min-w-56 rounded-xl border border-white/15 bg-white/5 p-5">
                      <p className="text-sm text-slate-300">{latest.year} four-dham visits</p>
                      <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">
                        {formatNumber(latest.visitors)}
                      </p>
                      {change !== null ? (
                        <p className="mt-1 text-xs text-slate-400">
                          {change >= 0 ? '+' : ''}
                          {change.toFixed(1)}% vs {previous?.year}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-7 overflow-hidden rounded-xl bg-white text-slate-950">
                    <PilgrimArrivalsTable data={arrivals} />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    2020 and 2021 reflect pandemic disruption. Figures are shown as published and
                    are not smoothed or projected.
                  </p>
                </section>
              ) : null}

              <section
                aria-labelledby="prepare-heading"
                className="grid gap-8 lg:grid-cols-[1.05fr_.95fr]"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    Before you leave
                  </p>
                  <h2 id="prepare-heading" className="mt-2 font-display text-3xl font-semibold">
                    A safer yatra starts before the road
                  </h2>
                  <div className="mt-6 grid gap-3">
                    {guide.guidelines.map((item) => (
                      <div
                        key={item}
                        className="flex gap-3 rounded-xl border border-border bg-surface p-4"
                      >
                        <CheckCircle2
                          className="mt-0.5 size-5 shrink-0 text-success"
                          aria-hidden="true"
                        />
                        <p className="text-sm leading-6">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <aside className="rounded-2xl bg-[#e8f1ea] p-6 text-slate-900 dark:bg-slate-900 dark:text-white sm:p-8">
                  <Phone
                    className="size-7 text-emerald-700 dark:text-emerald-300"
                    aria-hidden="true"
                  />
                  <h3 className="mt-5 font-display text-2xl font-semibold">
                    Keep official help close
                  </h3>
                  <dl className="mt-6 space-y-4 text-sm">
                    <div>
                      <dt className="text-slate-600 dark:text-slate-400">Yatra control room</dt>
                      <dd className="mt-1 text-lg font-semibold">
                        {guide.helplines.yatra.join(' · ')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-600 dark:text-slate-400">Emergency response</dt>
                      <dd className="mt-1 text-lg font-semibold">{guide.helplines.emergency}</dd>
                    </div>
                  </dl>
                  <p className="mt-6 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    Opening dates, restrictions and route status can change. Follow the latest
                    direction of district administration and the official registration portal.
                  </p>
                </aside>
              </section>

              <section aria-labelledby="explore-heading">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    Beyond the pilgrimage
                  </p>
                  <h2 id="explore-heading" className="mt-2 font-display text-3xl font-semibold">
                    More of Uttarakhand, one route away
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {guide.destinations.map((place) => (
                    <article
                      key={place.slug}
                      className="group overflow-hidden rounded-xl border border-border bg-surface"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <Image
                          src={place.imageUrl}
                          alt={`${place.name}, Uttarakhand`}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                          {place.category}
                        </span>
                      </div>
                      <div className="p-5">
                        <h3 className="font-display text-xl font-semibold">{place.name}</h3>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" aria-hidden="true" />
                          {place.district}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {place.summary}
                        </p>
                        <div className="mt-4 flex gap-4 text-sm font-semibold">
                          <a
                            href={directionsUrl(place.mapDestination)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent hover:underline"
                          >
                            Directions
                          </a>
                          <a
                            href={place.officialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-text-light"
                          >
                            Official page
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section
                aria-labelledby="official-desk-heading"
                className="rounded-2xl border border-border bg-surface p-6 sm:p-8"
              >
                <div className="flex items-center gap-3">
                  <Map className="size-6 text-accent" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Government resources
                    </p>
                    <h2
                      id="official-desk-heading"
                      className="mt-1 font-display text-2xl font-semibold"
                    >
                      Official travel desk
                    </h2>
                  </div>
                </div>
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {guide.officialLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex min-h-24 items-center gap-4 rounded-xl border border-border p-4 transition hover:bg-surface-hover"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
                        {link.kind === 'map' ? (
                          <Map className="size-5" />
                        ) : link.kind === 'primary' ? (
                          <ShieldCheck className="size-5" />
                        ) : (
                          <FileText className="size-5" />
                        )}
                      </span>
                      <span className="flex-1">
                        <span className="block font-semibold">{link.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {link.description}
                        </span>
                      </span>
                      <ExternalLink
                        className="size-4 text-muted-foreground transition group-hover:text-accent"
                        aria-hidden="true"
                      />
                    </a>
                  ))}
                </div>
                <p className="mt-5 text-xs text-muted-foreground">
                  Guide links are from Uttarakhand Tourism; photographs are from Uttarakhand Tourism
                  and Unsplash. Verified {guide.verifiedOn}.{' '}
                  <a
                    href={guide.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-accent hover:underline"
                  >
                    Open source portal
                  </a>
                  .
                </p>
              </section>

              <p className="text-center text-xs leading-5 text-muted-foreground">
                This independent planning interface organises public information; it is not a
                booking service or a substitute for current government, medical or emergency advice.
              </p>
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
            <div className="rounded-xl border border-danger/20 bg-danger-soft p-6" role="alert">
              <h1 className="font-display text-2xl font-semibold">
                Tourism guide is temporarily unavailable
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {error ?? 'The data service did not return the guide.'}
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-accent"
              >
                Return to dashboard <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
