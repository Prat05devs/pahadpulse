import React from 'react';
import { Activity } from 'lucide-react';
import type { RecentSeismic, SeismicBand, SeismicEvent } from '../schemas';

const BAND_STYLE: Record<SeismicBand, { label: string; dot: string; text: string }> = {
  micro: { label: 'Micro', dot: 'bg-slate-400', text: 'text-slate-700' },
  minor: { label: 'Minor', dot: 'bg-sky-500', text: 'text-sky-800' },
  light: { label: 'Light', dot: 'bg-yellow-500', text: 'text-yellow-800' },
  moderate: { label: 'Moderate', dot: 'bg-orange-500', text: 'text-orange-800' },
  strong: { label: 'Strong', dot: 'bg-red-600', text: 'text-red-800' },
  major: { label: 'Major', dot: 'bg-purple-700', text: 'text-purple-900' },
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
}

function EventRow({
  event,
  isLargest,
  index,
}: {
  event: SeismicEvent;
  isLargest: boolean;
  index: number;
}) {
  const style = BAND_STYLE[event.band];

  return (
    <li
      className="pp-rise flex items-center gap-2.5 border-b border-border py-3 last:border-b-0 sm:gap-4"
      style={{ '--pp-delay': `${Math.min(index * 55, 600)}ms` } as React.CSSProperties}
    >
      {/* The ripple runs three times then stops, and only on the largest event. A ripple
          that looped would read as an earthquake still in progress. */}
      <span className="relative flex size-3 shrink-0 items-center justify-center">
        <span
          className={`absolute inline-flex size-3 rounded-full ${style.dot} ${
            isLargest ? 'pp-ripple' : ''
          } ${style.text}`}
          aria-hidden="true"
        />
      </span>

      <span className="w-10 shrink-0 font-mono text-lg font-semibold tabular-nums sm:w-14">
        {event.magnitude.toFixed(1)}
      </span>

      {/* Hidden on the narrowest screens, where roughly 190px of fixed columns would leave
          the place name barely readable. The band is still conveyed by the coloured dot and
          the magnitude itself, and it returns as soon as there is room. */}
      <span className={`hidden w-24 shrink-0 text-xs font-medium sm:inline ${style.text}`}>
        {style.label}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-text-light">{event.place}</span>
        <span className="block text-xs text-muted-foreground">
          {/* The band label reappears here when the column above is hidden, so the
              information is never actually lost on a phone. */}
          <span className={`sm:hidden ${style.text}`}>{style.label} · </span>
          {formatWhen(event.occurredAt)} IST
          {event.depthKm !== null && ` · ${event.depthKm.toFixed(0)} km deep`}
          {event.magnitudeType !== null && ` · ${event.magnitudeType}`}
          {/* An automatic solution can still be revised upward or downward. Saying so is
              cheaper than explaining later why a number changed. */}
          {event.reviewStatus === 'automatic' && ' · provisional'}
        </span>
      </span>
    </li>
  );
}

export function SeismicPanel({ data }: { data: RecentSeismic }) {
  const { events, countLast30Days, largest } = data;

  return (
    <section className="surface-card pp-rise overflow-hidden" aria-labelledby="seismic-heading">
      <div className="border-b border-border px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Seismic activity
            </p>
            <h2 id="seismic-heading" className="mt-1 text-xl font-semibold tracking-tight">
              Recent earthquakes
            </h2>
          </div>
          <span className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="pp-live-dot inline-block size-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        </div>

        {/* The answer first, in a sentence, before the list. */}
        <p className="pp-fade mt-3 text-base leading-relaxed text-text-light sm:text-lg">
          {countLast30Days === 0 ? (
            <>No earthquakes recorded in Uttarakhand in the last 30 days.</>
          ) : (
            <>
              <span className="font-semibold">{countLast30Days}</span> earthquake
              {countLast30Days === 1 ? '' : 's'} recorded in the last 30 days
              {largest !== null && (
                <>
                  , the largest <span className="font-semibold">M{largest.magnitude.toFixed(1)}</span>{' '}
                  at {largest.place}
                </>
              )}
              .
            </>
          )}
        </p>

        {/* Said plainly, because a seismic panel on a government dashboard invites exactly
            this misreading. */}
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          These are earthquakes that have already happened, not warnings or predictions.
          Earthquakes cannot be predicted.
        </p>
      </div>

      {events.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground sm:px-6">
          Nothing recorded in this period.
        </p>
      ) : (
        <ul className="px-4 sm:px-6">
          {events.map((event, index) => (
            <EventRow
              key={event.id}
              event={event}
              isLargest={largest !== null && event.id === largest.id}
              index={index}
            />
          ))}
        </ul>
      )}

      {data.source !== null && (
        <p className="border-t border-border px-4 py-3 text-[0.68rem] text-muted-foreground/70 sm:px-6">
          {data.source.attribution}
        </p>
      )}
    </section>
  );
}

/** Compact strip for pages where seismic activity is context rather than the subject. */
export function SeismicStrip({ data }: { data: RecentSeismic }) {
  return (
    <div className="surface-card pp-rise flex items-center gap-4 p-4">
      <Activity className="size-5 shrink-0 text-accent" strokeWidth={1.8} aria-hidden="true" />
      <p className="text-sm text-text-light">
        <span className="font-semibold">{data.countLast30Days}</span> earthquake
        {data.countLast30Days === 1 ? '' : 's'} in the last 30 days
        {data.largest !== null && (
          <> · largest M{data.largest.magnitude.toFixed(1)}</>
        )}
      </p>
    </div>
  );
}
