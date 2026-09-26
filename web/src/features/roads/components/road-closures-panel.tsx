import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react';
import {
  STATUS_LABEL,
  durationSince,
  formatIst,
  roadTypeLabel,
  unavailableMessage,
} from '../closures';
import type { RoadClosure, RoadClosuresReport } from '../schemas';

interface RoadClosuresPanelProps {
  /** `null` when the request itself failed — shown like any other "cannot say". */
  report: RoadClosuresReport | null;
  now: Date;
  /** Show at most this many closures; the rest are summarised with `moreHref`. */
  limit?: number;
  moreHref?: string;
  /** Hide the district line when the whole panel is already one district. */
  showDistrict?: boolean;
  /** Used in "No closures reported for …". */
  scopeLabel?: string;
}

const STATUS_TONE: Record<RoadClosure['status'], string> = {
  closed: 'bg-rose-100 text-rose-800',
  partially_closed: 'bg-amber-100 text-amber-900',
  partially_opened: 'bg-sky-100 text-sky-800',
  open: 'bg-emerald-100 text-emerald-800',
  unknown: 'bg-slate-100 text-slate-700',
};

const TYPE_TONE: Record<string, string> = {
  NH: 'border-blue-200 bg-blue-50 text-blue-800',
  SH: 'border-amber-200 bg-amber-50 text-amber-900',
};

const PWD_HELPLINE = '1364';

function ClosureCard({
  closure,
  now,
  showDistrict,
}: {
  closure: RoadClosure;
  now: Date;
  showDistrict: boolean;
}) {
  return (
    <li className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold ${TYPE_TONE[closure.roadType ?? ''] ?? 'border-border bg-muted text-muted-foreground'}`}
        >
          {roadTypeLabel(closure.roadType)}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${STATUS_TONE[closure.status]}`}
        >
          {STATUS_LABEL[closure.status]}
        </span>
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-5" title={closure.roadName}>
        {closure.roadName}
      </h3>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {showDistrict && closure.district !== null ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" aria-hidden="true" />
            {closure.district.name}
          </span>
        ) : null}
        {closure.kmMarkers !== null ? <span>Blocked at km {closure.kmMarkers}</span> : null}
      </p>
      <p className="mt-3 flex items-center gap-1.5 text-xs">
        <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
        Closed {formatIst(closure.closedAt)} IST · {durationSince(closure.closedAt, now)} ago
      </p>
      {closure.expectedOpenAt !== null ? (
        <p
          className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs ${closure.estimatePassed ? 'bg-amber-50 text-amber-900' : 'bg-muted text-muted-foreground'}`}
        >
          {closure.estimatePassed
            ? `The division’s estimate (${formatIst(closure.expectedOpenAt)}) has passed without a reopening report.`
            : `Division’s estimate: open by ${formatIst(closure.expectedOpenAt)} IST.`}
        </p>
      ) : null}
      {closure.division !== null ? (
        <p className="mt-auto pt-3 text-[0.7rem] text-muted-foreground">
          Reported by {closure.division}
          {closure.department !== null && closure.department !== closure.division
            ? ` (${closure.department})`
            : ''}
        </p>
      ) : null}
    </li>
  );
}

/**
 * PWD road closures, or an honest statement of why they cannot be shown.
 *
 * The rules it keeps: an unavailable or failed report is never rendered as "no closures"
 * (RD-1); a closure always shows when PWD said it closed and when we last checked; a division's
 * reopening estimate is theirs, flagged once it has passed (RD-7); and roads that reopened in
 * the last day are listed, so someone who saw a closure earlier sees it clear.
 */
export function RoadClosuresPanel({
  report,
  now,
  limit,
  moreHref,
  showDistrict = true,
  scopeLabel = 'Uttarakhand',
}: RoadClosuresPanelProps) {
  const dashboardUrl = report?.source.url ?? 'https://mis.pwduk.in/pwd/roadClosure';

  if (report === null || !report.available) {
    const message =
      report === null
        ? {
            title: 'Road closures could not be loaded',
            body: 'This does not mean every road is open. Check PWD’s dashboard or call 1364 before you travel.',
          }
        : unavailableMessage(report);
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
        <p className="flex items-center gap-2 font-semibold text-amber-950">
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          {message.title}
        </p>
        <p className="mt-1.5 text-sm leading-6 text-amber-950/80">{message.body}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent/90"
          >
            PWD road closure dashboard <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
          <a
            href={`tel:${PWD_HELPLINE}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-950 hover:bg-amber-50"
          >
            <Phone className="size-3.5" aria-hidden="true" /> Call {PWD_HELPLINE}
          </a>
        </div>
      </div>
    );
  }

  const shown = limit === undefined ? report.closures : report.closures.slice(0, limit);
  const hidden = report.closures.length - shown.length;

  return (
    <div className="space-y-4">
      {report.closures.length === 0 ? (
        <div className="flex gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
          <CheckCircle2
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">
              No closures are currently reported to PWD for {scopeLabel}.
            </p>
            <p className="mt-1 text-muted-foreground">
              Not every road is monitored, and a road can be blocked before it is reported. Call{' '}
              {PWD_HELPLINE} before travelling on remote routes.
            </p>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((closure) => (
            <ClosureCard key={closure.id} closure={closure} now={now} showDistrict={showDistrict} />
          ))}
        </ul>
      )}

      {hidden > 0 && moreHref !== undefined ? (
        <Link
          href={moreHref}
          className="inline-flex text-sm font-semibold text-accent hover:underline"
        >
          See all {report.closures.length} closures
        </Link>
      ) : null}

      {report.recentlyReopened.length > 0 ? (
        <details className="group rounded-2xl border border-emerald-200 bg-emerald-50/60 text-sm">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 font-semibold text-emerald-950 [&::-webkit-details-marker]:hidden">
            <RotateCcw className="size-4" aria-hidden="true" />
            {report.recentlyReopened.length} road{report.recentlyReopened.length === 1 ? '' : 's'}{' '}
            reopened in the last 24 hours
          </summary>
          <ul className="divide-y divide-emerald-100 border-t border-emerald-200">
            {report.recentlyReopened.map((closure) => (
              <li
                key={closure.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5"
              >
                <span className="min-w-0">
                  <span className="line-clamp-1 font-medium">{closure.roadName}</span>
                  <span className="text-xs text-emerald-900/70">
                    {showDistrict && closure.district !== null ? `${closure.district.name} · ` : ''}
                    {roadTypeLabel(closure.roadType)}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-emerald-900/80">
                  Reopened · seen {formatIst(closure.statusSeenAt)} IST
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <p className="text-xs leading-5 text-muted-foreground">
        As reported to{' '}
        <a href={dashboardUrl} target="_blank" rel="noreferrer" className="font-medium underline">
          {report.source.department}
        </a>
        {report.checkedAt !== null ? `, checked ${formatIst(report.checkedAt)} IST` : ''}. A road
        can reopen before its report is updated, and reopening times are the division&apos;s
        estimates.
      </p>
    </div>
  );
}
