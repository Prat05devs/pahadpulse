import React from 'react';
import { CloudRain, ShieldCheck } from 'lucide-react';
import type { ImdCapLiveStatus } from '../types';

interface SourceStatusPanelProps {
  status: ImdCapLiveStatus | null;
  error?: string | null;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

export function SourceStatusPanel({ status, error }: SourceStatusPanelProps) {
  return (
    <section aria-labelledby="source-status-heading">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Data connections
        </p>
        <h2 id="source-status-heading" className="mt-1 text-xl font-semibold tracking-tight">
          Live source status
        </h2>
      </div>

      <div className="rounded-lg border border-info/15 bg-info-soft/45 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface text-info">
              <CloudRain className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">IMD CAP weather alerts</h3>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    status ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${status ? 'bg-success' : 'bg-warning'}`}
                    aria-hidden="true"
                  />
                  {status ? 'Connected' : 'Check unavailable'}
                </span>
              </div>
              {status ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  The public IMD feed is responding with {status.itemCount} current feed item
                  {status.itemCount === 1 ? '' : 's'}.
                </p>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {error || 'The live source check could not be completed.'}
                </p>
              )}
            </div>
          </div>

          {status ? (
            <dl className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-3 border-t border-info/10 pt-4 text-sm sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
              <div>
                <dt className="text-xs text-muted-foreground">Latest publication</dt>
                <dd className="mt-1 font-medium">
                  {status.latestPublishedAt ? (
                    <time dateTime={new Date(status.latestPublishedAt).toISOString()}>
                      {formatDate(status.latestPublishedAt)}
                    </time>
                  ) : (
                    'Not reported'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Last checked</dt>
                <dd className="mt-1 font-medium">
                  <time dateTime={status.checkedAt}>{formatDate(status.checkedAt)}</time>
                </dd>
              </div>
            </dl>
          ) : null}
        </div>

        <div className="mt-5 flex items-start gap-2 border-t border-info/10 pt-4 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-info" aria-hidden="true" />
          <p>
            {status?.displayNotice ||
              'Only sources verified by a live backend check are marked connected.'}
          </p>
        </div>
      </div>
    </section>
  );
}
