import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  CloudSun,
  ExternalLink,
  MapPin,
  Mountain,
  Navigation,
  Phone,
  Route,
  Signal,
  Snowflake,
  Sun,
  Thermometer,
  type LucideIcon,
} from 'lucide-react';
import { AlertCard } from '@/features/alerts/components';
import { RoadClosuresPanel } from '@/features/roads/components/road-closures-panel';
import type { RoadClosuresReport } from '@/features/roads/schemas';
import type { Alert } from '@/features/alerts/schemas';
import type { DistrictNetwork } from '@/features/connectivity/schemas';
import type { TourismGuide } from '@/features/tourism/pilgrim-schemas';
import type { Condition, WeatherData } from '@/features/weather/schemas';
import { alertCoverage, rainfallCategory, type Destination } from '../model';

interface TripCheckReportProps {
  destination: Destination;
  travelDate: string;
  travelDateLabel: string;
  isToday: boolean;
  checkedAt: Date;
  /** `null` means the request failed — never the same thing as "no warnings". */
  alerts: Alert[] | null;
  weather: WeatherData | null;
  network: DistrictNetwork | null;
  guide: TourismGuide | null;
  /** The selectable travel dates, so the forecast strip can switch between them. */
  dates?: { value: string; label: string }[];
  /** PWD closures for the district; `null` when the request failed. */
  roads?: RoadClosuresReport | null;
}

const directionsUrl = (destination: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;

const formatIstTime = (date: Date) =>
  date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

const shortDay = (date: string) =>
  new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`)
  );
const dayOfMonth = (date: string) => Number(date.slice(8, 10));

const HEAVY_LEVELS = new Set(['heavy', 'very_heavy', 'extremely_heavy']);

const CONDITION_ICONS: Record<Condition['condition'], LucideIcon> = {
  clear: Sun,
  partly_cloudy: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  heavy_rain: CloudRainWind,
  snow: Snowflake,
  thunderstorm: CloudLightning,
  unknown: Cloud,
};

const telHref = (number: string) => `tel:${number.replace(/[^\d+]/g, '')}`;

function SectionHeading({
  icon: Icon,
  title,
  id,
}: {
  icon: LucideIcon;
  title: string;
  id: string;
}) {
  return (
    <h2 id={id} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-lg bg-info-soft text-info">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      {title}
    </h2>
  );
}

function GlanceTile({
  href,
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <a
      href={href}
      className={`group rounded-2xl border p-4 transition-shadow hover:shadow-card-hover ${tone}`}
    >
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] opacity-80">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </span>
      <span className="mt-2 block font-display text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </span>
      <span className="mt-0.5 block text-xs opacity-80">{detail}</span>
    </a>
  );
}

export function TripCheckReport({
  destination,
  travelDate,
  travelDateLabel,
  isToday,
  checkedAt,
  alerts,
  weather,
  network,
  guide,
  dates = [],
  roads = null,
}: TripCheckReportProps) {
  const district = destination.district;
  const place = destination.kind === 'place' ? destination.place : null;
  const altitudeM = place !== null && 'altitudeM' in place ? place.altitudeM : null;

  const inForce = (alerts ?? []).filter(
    (alert) => alertCoverage(alert, travelDate) === 'covers-date'
  );
  const notOnDate = (alerts ?? []).filter(
    (alert) => alertCoverage(alert, travelDate) !== 'covers-date'
  );

  const forecast = weather?.forecast ?? [];
  const day = forecast.find((entry) => entry.date === travelDate) ?? null;
  const rain = rainfallCategory(day?.precipitationMm ?? null);
  const heavy = rain !== null && HEAVY_LEVELS.has(rain.level);
  const mobile = network?.connections.find((connection) => connection.kind === 'mobile') ?? null;
  const registration = guide?.officialLinks.find((link) => link.kind === 'primary') ?? null;
  const selectable = new Set(dates.map((date) => date.value));
  const strip = forecast.filter((entry) => selectable.has(entry.date));
  const DayIcon = day?.condition ? CONDITION_ICONS[day.condition.condition] : Thermometer;

  return (
    <div className="space-y-8">
      {/* Where and when: the photo leads, with a glass caption like the homepage cards. */}
      <section aria-labelledby="trip-summary-heading">
        <div
          className={`relative isolate flex min-h-64 flex-col justify-end overflow-hidden rounded-3xl p-3 shadow-card sm:min-h-80 sm:p-4 ${place === null ? 'bg-gradient-to-br from-sky-100 via-indigo-50 to-emerald-50' : 'bg-muted'}`}
        >
          {place !== null ? (
            <Image
              src={place.imageUrl}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 64rem, 100vw"
              className="-z-10 object-cover"
            />
          ) : (
            <Mountain
              className="absolute right-6 top-6 -z-10 size-40 text-sky-200"
              strokeWidth={1}
              aria-hidden="true"
            />
          )}
          <div className="max-w-xl rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-inset ring-white/80 backdrop-blur-xl backdrop-saturate-150 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              {travelDateLabel}
            </p>
            <h2
              id="trip-summary-heading"
              className="mt-1 font-display text-3xl font-semibold tracking-tight text-slate-950"
            >
              {destination.name}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden="true" />
                {district.name} district
              </span>
              {altitudeM !== null ? (
                <span className="inline-flex items-center gap-1">
                  <Mountain className="size-3.5" aria-hidden="true" />
                  {altitudeM.toLocaleString('en-IN')} m
                </span>
              ) : null}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {place !== null ? (
                <>
                  <a
                    href={directionsUrl(place.mapDestination)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent/90"
                  >
                    <Navigation className="size-4" aria-hidden="true" /> Directions
                  </a>
                  <a
                    href={place.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-900/10 bg-white/70 px-4 text-sm font-semibold text-slate-900 hover:bg-white"
                  >
                    Official guide <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                </>
              ) : (
                <Link
                  href={`/districts/${district.slug}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent/90"
                >
                  Open the {district.name} district dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* At a glance: one tile per signal, each jumping to its detail. */}
      <section aria-label="At a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <GlanceTile
          href="#trip-warnings-heading"
          icon={AlertTriangle}
          label="Warnings"
          value={alerts === null ? 'Unavailable' : String(inForce.length)}
          detail={
            alerts === null
              ? 'Could not be checked'
              : isToday
                ? 'in force today'
                : 'valid on this date so far'
          }
          tone={
            alerts === null || inForce.length > 0
              ? 'border-rose-200 bg-rose-50/80 text-rose-950'
              : isToday
                ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
                : 'border-slate-200 bg-slate-50 text-slate-900'
          }
        />
        <GlanceTile
          href="#trip-weather-heading"
          icon={CloudRain}
          label="Rain"
          value={rain?.label ?? '—'}
          detail={
            day?.precipitationMm != null ? `${day.precipitationMm} mm in 24 hours` : 'No forecast'
          }
          tone={
            heavy
              ? 'border-amber-300 bg-amber-50/90 text-amber-950'
              : 'border-sky-200 bg-sky-50/80 text-sky-950'
          }
        />
        <GlanceTile
          href="#trip-weather-heading"
          icon={DayIcon}
          label="Temperature"
          value={
            day?.minTemperatureC != null && day.maxTemperatureC != null
              ? `${Math.round(day.minTemperatureC)}°–${Math.round(day.maxTemperatureC)}°`
              : '—'
          }
          detail={day?.condition?.label.en ?? 'No forecast'}
          tone="border-orange-200 bg-orange-50/70 text-orange-950"
        />
        <GlanceTile
          href="#trip-signal-heading"
          icon={Signal}
          label="Mobile signal"
          value={
            mobile === null
              ? '—'
              : `${mobile.downloadMbps.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Mbps`
          }
          detail={mobile === null ? 'Not measured' : 'District average'}
          tone="border-teal-200 bg-teal-50/80 text-teal-950"
        />
      </section>

      {/* 1. Official warnings — always first among the details. */}
      <section aria-labelledby="trip-warnings-heading" className="scroll-mt-24 space-y-3">
        <SectionHeading icon={AlertTriangle} title="Official warnings" id="trip-warnings-heading" />
        {alerts === null ? (
          <div
            className="rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm"
            role="alert"
          >
            <p className="font-semibold">Official warnings could not be loaded right now.</p>
            <p className="mt-1 text-muted-foreground">
              This does not mean there are none. Check the{' '}
              <a
                href="https://sachet.ndma.gov.in/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-accent underline"
              >
                NDMA SACHET portal
              </a>{' '}
              or call the helplines below before you travel.
            </p>
          </div>
        ) : inForce.length === 0 ? (
          // Green only for today. For a later date "none yet" is weak evidence: warnings are
          // usually issued close to the day, so it must not read as reassurance.
          <div
            className={`flex gap-3 rounded-2xl border p-4 text-sm ${isToday ? 'border-success/25 bg-success-soft' : 'border-border bg-surface'}`}
          >
            <CheckCircle2
              className={`mt-0.5 size-5 shrink-0 ${isToday ? 'text-success' : 'text-muted-foreground'}`}
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">
                {isToday
                  ? `No official warning is in force for ${district.name} district today.`
                  : `No warning issued so far is valid for ${district.name} district on this date.`}
              </p>
              <p className="mt-1 text-muted-foreground">
                Checked {formatIstTime(checkedAt)} IST against warnings in force now. New warnings
                can be issued at any time, so check again on the morning you travel. This is not a
                statement that the journey is safe.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {inForce.length} official warning{inForce.length === 1 ? '' : 's'} in force for{' '}
              {district.name} district {isToday ? 'today' : 'that remain valid on this date'}.
              Checked {formatIstTime(checkedAt)} IST.
            </p>
            <div className="grid gap-3">
              {inForce.map((alert, index) => (
                <AlertCard key={alert.id} alert={alert} index={index} />
              ))}
            </div>
          </>
        )}
        {notOnDate.length > 0 ? (
          <details className="group rounded-2xl border border-border bg-surface text-sm">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold [&::-webkit-details-marker]:hidden">
              <span>
                {notOnDate.length} other warning{notOnDate.length === 1 ? '' : 's'} in force now but
                not on your date
              </span>
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="border-t border-border p-4">
              <p className="text-muted-foreground">
                By their own validity times these end before, or begin after, {travelDateLabel}.
                Warnings are often extended — recheck nearer the day.
              </p>
              <div className="mt-3 grid gap-3">
                {notOnDate.map((alert, index) => (
                  <AlertCard key={alert.id} alert={alert} index={index} />
                ))}
              </div>
            </div>
          </details>
        ) : null}
      </section>

      {/* 2. Forecast: the chosen day, and the week around it as tappable dates. */}
      <section
        aria-labelledby="trip-weather-heading"
        className="surface-card scroll-mt-24 space-y-4 rounded-2xl p-4 sm:p-5"
      >
        <SectionHeading icon={CloudRain} title="Weather forecast" id="trip-weather-heading" />
        {day === null ? (
          <p className="text-sm text-muted-foreground">
            A forecast for this date is not available right now.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-3">
              <DayIcon className="size-10 text-sky-600" strokeWidth={1.5} aria-hidden="true" />
              <div>
                <p className="font-display text-3xl font-semibold tabular-nums">
                  {day.minTemperatureC !== null && day.maxTemperatureC !== null
                    ? `${Math.round(day.minTemperatureC)}°–${Math.round(day.maxTemperatureC)}°C`
                    : '—'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {day.condition?.label.en ?? 'Conditions unavailable'}
                </p>
              </div>
            </div>
            <div>
              <p className="font-display text-3xl font-semibold tabular-nums">
                {day.precipitationMm === null ? '—' : `${day.precipitationMm} mm`}
              </p>
              <p className="text-sm text-muted-foreground">Rain in 24 hours</p>
            </div>
            {isToday && weather?.temperature !== undefined ? (
              <p className="text-sm text-muted-foreground">
                Now {Math.round(weather.temperature.value)}°C
                {weather.condition ? `, ${weather.condition.label.en.toLowerCase()}` : ''}
                {weather.observedAt
                  ? ` · reading ${formatIstTime(new Date(weather.observedAt))} IST`
                  : ''}
              </p>
            ) : null}
          </div>
        )}
        {rain !== null ? (
          <p
            className={`rounded-xl px-3.5 py-2.5 text-sm ${heavy ? 'bg-warning-soft font-medium' : 'bg-sky-50 text-sky-950'}`}
          >
            <span className="font-semibold">{rain.label}</span> by IMD&apos;s rainfall intensity
            terms.
            {heavy
              ? ' Heavy rain in the hills can bring landslides and blocked roads; follow district administration advisories.'
              : ''}
          </p>
        ) : null}

        {strip.length > 0 ? (
          <nav aria-label="Change travel date" className="-mx-1 overflow-x-auto pb-1">
            <ol className="flex min-w-max gap-2 px-1">
              {strip.map((entry) => {
                const Icon = entry.condition ? CONDITION_ICONS[entry.condition.condition] : Cloud;
                const selected = entry.date === travelDate;
                const wet = (entry.precipitationMm ?? 0) >= 2.5;
                return (
                  <li key={entry.date}>
                    <Link
                      href={`/trip-check?to=${destination.slug}&date=${entry.date}`}
                      aria-current={selected ? 'date' : undefined}
                      scroll={false}
                      className={`flex w-20 flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center transition-colors ${selected ? 'border-accent bg-info-soft ring-1 ring-accent' : 'border-border bg-surface hover:bg-surface-hover'}`}
                    >
                      <span className="text-xs font-semibold">
                        {shortDay(entry.date)} {dayOfMonth(entry.date)}
                      </span>
                      <Icon className="size-5 text-sky-600" aria-hidden="true" />
                      <span className="text-xs tabular-nums">
                        {entry.maxTemperatureC !== null
                          ? `${Math.round(entry.maxTemperatureC)}°`
                          : '—'}
                        <span className="text-muted-foreground">
                          {entry.minTemperatureC !== null
                            ? ` ${Math.round(entry.minTemperatureC)}°`
                            : ''}
                        </span>
                      </span>
                      <span
                        className={`text-[0.68rem] tabular-nums ${wet ? 'font-semibold text-sky-700' : 'text-muted-foreground'}`}
                      >
                        {entry.precipitationMm !== null ? `${entry.precipitationMm} mm` : '—'}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}

        <p className="text-xs leading-5 text-muted-foreground">
          Model forecast for the {weather?.station.name.en ?? district.name} area from{' '}
          {weather?.source?.department.en ?? 'the weather source'}, not an IMD forecast.
          {altitudeM !== null
            ? ` ${destination.name} sits at ${altitudeM.toLocaleString('en-IN')} m and is usually much colder than the district headquarters.`
            : ''}
        </p>
      </section>

      {/* 3. Roads — PWD closures in this district, or an honest "cannot say". */}
      <section aria-labelledby="trip-roads-heading" className="scroll-mt-24 space-y-3">
        <SectionHeading icon={Route} title="Road closures" id="trip-roads-heading" />
        <RoadClosuresPanel
          report={roads}
          now={checkedAt}
          limit={6}
          moreHref={`/roads?district=${district.slug}#closures`}
          showDistrict={false}
          scopeLabel={`${district.name} district`}
        />
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {registration !== null ? (
            <a
              href={registration.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
            >
              {registration.label} <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : null}
          <Link
            href={`/roads?district=${district.slug}#closures`}
            className="font-semibold text-accent hover:underline"
          >
            Roads &amp; highways in {district.name}
          </Link>
        </p>
      </section>

      {/* 4. Signal and help */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section
          aria-labelledby="trip-signal-heading"
          className="surface-card scroll-mt-24 space-y-3 rounded-2xl p-4 sm:p-5"
        >
          <SectionHeading icon={Signal} title="Mobile internet" id="trip-signal-heading" />
          {network === null ? (
            <p className="text-sm text-muted-foreground">
              Connectivity measurements could not be loaded right now.
            </p>
          ) : mobile === null ? (
            <p className="text-sm text-muted-foreground">
              No mobile speed measurements are published for {district.name} district.
            </p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-teal-50/80 p-3">
                  <dt className="text-xs text-teal-900/80">Download</dt>
                  <dd className="font-display text-xl font-semibold tabular-nums text-teal-950">
                    {mobile.downloadMbps.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Mbps
                  </dd>
                </div>
                <div className="rounded-xl bg-teal-50/80 p-3">
                  <dt className="text-xs text-teal-900/80">Latency</dt>
                  <dd className="font-display text-xl font-semibold tabular-nums text-teal-950">
                    {mobile.latencyMs} ms
                  </dd>
                </div>
              </dl>
              {mobile.sample.strength === 'thin' ? (
                <p className="text-xs font-medium text-amber-800">
                  Based on few speed tests — treat as indicative only.
                </p>
              ) : null}
            </>
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            District average of phone speed tests
            {mobile !== null ? ` (quarter from ${mobile.quarterStart})` : ''}. Trek routes, high
            passes and valleys can have no signal at all — download offline maps and share your plan
            before you go.
          </p>
        </section>

        <section
          aria-labelledby="trip-help-heading"
          className="space-y-3 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50 p-4 sm:p-5"
        >
          <SectionHeading icon={Phone} title="Official help" id="trip-help-heading" />
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Yatra control room
          </p>
          <div className="flex flex-wrap gap-2">
            {(guide?.helplines.yatra ?? ['1364']).map((number) => (
              <a
                key={number}
                href={telHref(number)}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-sky-200 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-sky-50"
              >
                <Phone className="size-3.5 text-accent" aria-hidden="true" />
                {number}
              </a>
            ))}
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Emergency response
          </p>
          <a
            href={telHref(guide?.helplines.emergency ?? '112')}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700"
          >
            <Phone className="size-3.5" aria-hidden="true" />
            {guide?.helplines.emergency ?? '112'}
          </a>
          <p className="text-xs leading-5 text-muted-foreground">
            Call before setting out for current road and weather conditions on your route.
          </p>
        </section>
      </div>
    </div>
  );
}
