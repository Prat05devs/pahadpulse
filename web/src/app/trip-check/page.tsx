import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle, CalendarCheck, CloudRain, Phone, Signal } from 'lucide-react';
import { z } from 'zod';
import { buildPageMetadata } from '@/lib/seo';
import { apiClient } from '@/lib/api';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { DistrictSummarySchema } from '@/features/dashboard/schemas';
import { fetchAreaAlerts } from '@/features/alerts/services';
import { fetchAreaNetwork } from '@/features/connectivity/services';
import { fetchTourismGuide } from '@/features/tourism/services';
import { fetchWeatherForArea } from '@/features/weather/services';
import {
  destinationGroups,
  istDate,
  normaliseTravelDate,
  resolveDestination,
  travelDateOptions,
} from '@/features/trip-check/model';
import { TripCheckForm } from '@/features/trip-check/components/trip-check-form';
import { TripCheckReport } from '@/features/trip-check/components/trip-check-report';

export const metadata = buildPageMetadata({
  title: 'Trip Check: Uttarakhand Travel Conditions by Date',
  description:
    'Before you travel in Uttarakhand, see official warnings, the rain forecast, mobile signal and helplines for any destination or district on your date.',
  path: '/trip-check',
  keywords: [
    'Uttarakhand travel conditions',
    'Kedarnath weather warning',
    'Char Dham travel advisory',
    'Uttarakhand rain forecast',
  ],
});

const DistrictListSchema = z.array(DistrictSummarySchema);

interface TripCheckPageProps {
  searchParams: Promise<{ to?: string | string[]; date?: string | string[] }>;
}

const single = (value: string | string[] | undefined) =>
  typeof value === 'string' ? value : undefined;

export default async function TripCheckPage({ searchParams }: TripCheckPageProps) {
  const params = await searchParams;
  const now = new Date();

  // The place list degrades on its own: without the guide, districts can still be checked.
  const [districtsResult, guideResult] = await Promise.allSettled([
    apiClient.get('/areas/districts', DistrictListSchema),
    fetchTourismGuide(),
  ]);
  const districts =
    districtsResult.status === 'fulfilled'
      ? districtsResult.value.map((district) => ({ slug: district.slug, name: district.name.en }))
      : [];
  const guide = guideResult.status === 'fulfilled' ? guideResult.value : null;

  const dates = travelDateOptions(now);
  const travelDate = normaliseTravelDate(single(params.date), now);
  const requestedTo = single(params.to);
  const destination = resolveDestination(requestedTo, guide, districts);

  let report: React.ReactNode = null;
  if (destination !== null) {
    const slug = destination.district.slug;
    // Each signal is fetched and fails independently; a failure renders as "could not load",
    // never as an empty — and therefore reassuring — result.
    const [alerts, weather, network] = await Promise.allSettled([
      fetchAreaAlerts(slug, undefined, 50),
      fetchWeatherForArea(slug),
      fetchAreaNetwork(slug),
    ]);
    report = (
      <TripCheckReport
        destination={destination}
        travelDate={travelDate}
        travelDateLabel={dates.find((date) => date.value === travelDate)?.label ?? travelDate}
        isToday={travelDate === istDate(now)}
        checkedAt={now}
        alerts={alerts.status === 'fulfilled' ? alerts.value : null}
        weather={weather.status === 'fulfilled' ? weather.value : null}
        network={network.status === 'fulfilled' ? network.value : null}
        guide={guide}
        dates={dates}
      />
    );
  }

  const showForm = districts.length > 0;

  return (
    <DashboardLayout>
      <div className="min-h-full">
        <header className="relative isolate overflow-hidden border-b border-border bg-gradient-to-br from-sky-50 via-surface to-emerald-50">
          <div
            className="absolute -right-24 -top-24 -z-10 size-96 rounded-full bg-sky-200/40 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-32 left-1/4 -z-10 size-80 rounded-full bg-emerald-200/30 blur-3xl"
            aria-hidden="true"
          />
          <div className="mx-auto max-w-5xl px-4 pb-6 pt-8 sm:px-6 md:pb-8 md:pt-10 lg:px-8">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              <CalendarCheck className="size-4" aria-hidden="true" /> Trip check
            </p>
            <h1 className="mt-2 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              Before you travel, check the signals
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Official warnings, the rain forecast, mobile signal and who to call — for any place in
              Uttarakhand, on your date. Pahad Pulse shows the evidence; it does not declare a
              journey safe.
            </p>
            <div className="mt-6">
              {showForm ? (
                <TripCheckForm
                  groups={destinationGroups(guide, districts)}
                  dates={dates}
                  selectedTo={destination?.slug ?? ''}
                  selectedDate={travelDate}
                />
              ) : (
                <div
                  className="rounded-xl border border-danger/20 bg-danger-soft p-4 text-sm"
                  role="alert"
                >
                  Destinations could not be loaded right now. Please try again shortly.
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
          {requestedTo !== undefined && destination === null && showForm ? (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm" role="status">
              That destination isn&apos;t in the list. Choose a place or district above.
            </p>
          ) : null}

          {report ?? (
            <>
              <section aria-labelledby="trip-popular-heading" className="space-y-4">
                <h2 id="trip-popular-heading" className="text-lg font-semibold tracking-tight">
                  Start with the Char Dham
                </h2>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {(guide?.charDham ?? []).map((place) => (
                    <Link
                      key={place.slug}
                      href={`/trip-check?to=${place.slug}&date=${travelDate}`}
                      className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl bg-muted p-2 shadow-card transition-shadow hover:shadow-card-hover"
                    >
                      <Image
                        src={place.imageUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 15rem, 50vw"
                        className="-z-10 object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                      <span className="rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-inset ring-white/80 backdrop-blur-xl">
                        <span className="block font-semibold text-slate-950">{place.name}</span>
                        <span className="block text-xs text-slate-700">
                          {place.district} · {place.altitudeM.toLocaleString('en-IN')} m
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>

              <section aria-labelledby="trip-explain-heading" className="space-y-4">
                <h2 id="trip-explain-heading" className="text-lg font-semibold tracking-tight">
                  What you&apos;ll see
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      icon: AlertTriangle,
                      title: 'Official warnings',
                      copy: 'SDMA and NDMA warnings for the district, matched to your date.',
                      tone: 'bg-rose-50 text-rose-700',
                    },
                    {
                      icon: CloudRain,
                      title: 'Rain & temperature',
                      copy: 'A 7-day forecast, with rain described in IMD’s own terms.',
                      tone: 'bg-sky-50 text-sky-700',
                    },
                    {
                      icon: Signal,
                      title: 'Mobile signal',
                      copy: 'Measured phone internet speeds for the district.',
                      tone: 'bg-teal-50 text-teal-700',
                    },
                    {
                      icon: Phone,
                      title: 'Who to call',
                      copy: 'Yatra control room and emergency numbers, one tap away.',
                      tone: 'bg-indigo-50 text-indigo-700',
                    },
                  ].map((item) => (
                    <li key={item.title} className="surface-card rounded-2xl p-4">
                      <span
                        className={`flex size-9 items-center justify-center rounded-xl ${item.tone}`}
                      >
                        <item.icon className="size-4" aria-hidden="true" />
                      </span>
                      <p className="mt-3 font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.copy}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          <p className="text-xs leading-5 text-muted-foreground">
            Pahad Pulse organises public information and is not a government service. Always follow
            the latest instructions of the district administration, SDMA and the police.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
