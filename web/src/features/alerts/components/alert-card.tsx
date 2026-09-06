'use client';

import React from 'react';
import type { Alert } from '../schemas';

interface AlertCardProps {
  alert: Alert;
  /** Position in the list, for the entrance stagger. */
  index?: number;
}

/**
 * Severity colours, matching the map legend exactly.
 *
 * The same warning must not be one colour on the map and another in the list — a reader
 * cross-referencing the two would reasonably conclude they are different alerts. These are
 * SACHET's own red-orange-yellow ordering, kept rather than re-invented.
 *
 * `unknown` is a real CAP severity, not a gap: a source may issue a warning without
 * grading it, and that must render as neutral rather than crash the card.
 */
const SEVERITY: Record<string, { color: string; label: string; tint: string }> = {
  extreme: { color: '#6D0F7B', label: 'Extreme', tint: 'rgba(109,15,123,0.10)' },
  severe: { color: '#C2101B', label: 'Severe', tint: 'rgba(194,16,27,0.10)' },
  moderate: { color: '#F0620E', label: 'Moderate', tint: 'rgba(240,98,14,0.10)' },
  minor: { color: '#E0B100', label: 'Minor', tint: 'rgba(224,177,0,0.12)' },
  unknown: { color: '#5B6B93', label: 'Unspecified', tint: 'rgba(91,107,147,0.10)' },
};

const TYPE_ICONS: Record<string, string> = {
  weather: '🌦️',
  river: '🌊',
  flood: '💧',
  road: '🛣️',
  disaster: '🚨',
};

function formatWhen(date: Date): string {
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

export function AlertCard({ alert, index = 0 }: AlertCardProps) {
  const severity = SEVERITY[alert.severity] ?? SEVERITY.unknown;
  const icon = TYPE_ICONS[alert.type] ?? '⚠️';

  const issuedDate = new Date(alert.issuedAt);
  const expiresDate = alert.expiresAt === null ? null : new Date(alert.expiresAt);
  const isExpired = expiresDate !== null && expiresDate <= new Date();

  return (
    <article
      /**
       * Frosted-glass card. The translucency is kept mild and the text stays near-black:
       * this is safety information read on projectors in bright rooms, so the glass is a
       * surface treatment, never something the reader has to see through to reach a word.
       */
      className="pp-rise group relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_14px_44px_rgba(15,23,42,0.10)]"
      style={{ '--pp-delay': `${Math.min(index * 50, 400)}ms` } as React.CSSProperties}
    >
      {/* A wash of the severity colour, strongest at the edge it starts from. Carries the
          grading without tinting the text background enough to cost contrast. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: `linear-gradient(105deg, ${severity.tint}, transparent 58%)` }}
      />

      <div className="relative p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="text-xl leading-none sm:text-2xl" aria-hidden="true">
            {icon}
          </span>

          {/* `min-w-0` is what stops a long headline pushing the card wider than the screen.
              Without it a flex child refuses to shrink below its content and the text runs
              off the right edge on a phone. */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-white"
                style={{ backgroundColor: severity.color }}
              >
                {severity.label}
              </span>
              {isExpired && (
                <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[0.65rem] font-medium text-slate-700">
                  Expired
                </span>
              )}
            </div>

            {/* `break-words` handles the run-on district lists these feeds produce, e.g.
                "Rudraprayag,Pithoragarh,Tehri" with no spaces after the commas. */}
            <h3 className="mt-2 break-words text-sm font-semibold leading-snug text-slate-900 sm:text-[0.95rem]">
              {alert.headline}
            </h3>

            <p className="mt-1 break-words text-xs text-slate-500">
              {alert.authority} · {formatWhen(issuedDate)} IST
            </p>
          </div>
        </div>

        {alert.areas.length > 0 && (
          <div className="mt-3">
            <p className="text-[0.68rem] font-medium uppercase tracking-wide text-slate-400">
              Affects
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {alert.areas.map((area) => (
                <span
                  key={area.id}
                  className="rounded-lg border border-white/70 bg-white/60 px-2 py-0.5 text-[0.7rem] text-slate-700 backdrop-blur"
                >
                  {area.name.en}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Shown in the language the authority issued it in and never machine translated —
            a mistranslated flood warning is a safety failure. */}
        {alert.body.length > 0 && (
          <p
            className="mt-3 break-words text-sm leading-relaxed text-slate-600"
            lang={alert.language}
          >
            {alert.body}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/60 pt-2.5 text-[0.7rem] text-slate-500">
          <span className="capitalize">{alert.type}</span>
          {expiresDate !== null && <span>Valid until {formatWhen(expiresDate)} IST</span>}
        </div>
      </div>
    </article>
  );
}
