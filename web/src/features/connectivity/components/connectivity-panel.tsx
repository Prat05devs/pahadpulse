import React from 'react';
import { Clock3, TriangleAlert, Wifi } from 'lucide-react';
import type { DistrictNetwork } from '../schemas';

const n = (value: number) => value.toLocaleString('en-IN');

const KIND_LABEL = { fixed: 'Fixed broadband', mobile: 'Mobile' } as const;

/**
 * One district's measured internet performance.
 *
 * States plainly what the figure is and is not. Ookla's sample is whoever chose to run a
 * speed test, so this describes what those people got — not coverage, and not an operator's
 * advertised speed. Saying so on the panel matters more than saying it in a footnote,
 * because the number is what gets screenshotted.
 */
export function ConnectivityPanel({ data }: { data: DistrictNetwork }) {
  if (data.connections.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 sm:p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-text-light">
          <Clock3 className="size-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
          Internet speed: no measurements
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          No Speedtest results were recorded in {data.name.en} in the latest quarter. This is a gap
          in the measurements, not a statement about the connection here.
        </p>
      </div>
    );
  }

  const latest = data.connections[0]?.quarterStart ?? null;
  const provenance = data.connections[0]?.provenance ?? null;
  const forQuarter = data.connections.filter((connection) => connection.quarterStart === latest);

  return (
    <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <h3 className="mb-1 flex items-center gap-2 font-semibold tracking-tight text-text-light">
        <Wifi className="size-5 text-accent" strokeWidth={1.8} aria-hidden="true" />
        Internet speed
      </h3>
      <p className="mb-4 text-sm text-muted-foreground">
        What people who ran a speed test here actually got. Not a coverage map, and not an
        advertised speed.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {forQuarter.map((connection) => (
          <div key={connection.kind} className="rounded-lg border border-border p-3">
            <p className="text-sm text-muted-foreground">{KIND_LABEL[connection.kind]}</p>
            <p className="mt-0.5 font-display text-2xl font-semibold tabular-nums text-text-light">
              {connection.downloadMbps}
              <span className="ml-1 text-base font-normal text-muted-foreground">Mbps down</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {connection.uploadMbps} Mbps up · {connection.latencyMs} ms latency
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              From {n(connection.sample.tests)} speed tests by {n(connection.sample.devices)}{' '}
              devices
              {connection.sample.strength === 'thin' && (
                <span className="inline-flex items-center gap-1 font-medium text-warning">
                  <TriangleAlert className="size-3.5" strokeWidth={2} aria-hidden="true" />
                  thin sample — read with caution
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      {provenance !== null && (
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          {provenance.attribution}
        </p>
      )}
    </div>
  );
}
