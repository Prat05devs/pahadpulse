import React from 'react';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import type { ConnectionKind, StateNetwork } from '../schemas';

const n = (value: number) => value.toLocaleString('en-IN');

/**
 * Districts ranked by measured download speed, one connection type at a time.
 *
 * Ranked by value, unlike the migration breakdowns: here the order IS the finding, and a
 * reader scanning for "where does my district sit" wants the ladder.
 *
 * The bar is a single hue because this is one series measuring magnitude — colouring
 * thirteen districts thirteen ways would imply an identity the data does not carry. Scale is
 * the fastest district, so bar length is read against the best in the state.
 *
 * A thin sample gets an icon and the word "thin", never colour alone. It is a caution about
 * certainty, not a value judgement about the district, so it sits next to the test count
 * that justifies it.
 */
export function SpeedTable({ data, kind }: { data: StateNetwork; kind: ConnectionKind }) {
  const rows = data.districts
    .map((district) => ({
      district,
      connection: district.connections.find((entry) => entry.kind === kind),
    }))
    .filter(
      (
        row
      ): row is {
        district: (typeof data.districts)[number];
        connection: NonNullable<typeof row.connection>;
      } => row.connection !== undefined
    )
    .sort((a, b) => b.connection.downloadMbps - a.connection.downloadMbps);

  const fastest = rows[0]?.connection.downloadMbps ?? 1;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[40rem] text-sm">
        <caption className="sr-only">
          Districts ranked by measured {kind === 'fixed' ? 'fixed broadband' : 'mobile'} download
          speed
        </caption>
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-4 py-3 font-medium">
              District
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Download
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Upload
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Latency
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Speed tests
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ district, connection }) => (
            <tr key={district.slug} className="border-b border-border last:border-0">
              <th scope="row" className="px-4 py-3 text-left font-medium">
                <Link
                  className="underline-offset-2 hover:underline"
                  href={`/districts/${district.slug}`}
                >
                  {district.name.en}
                </Link>
              </th>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-medium text-text-light w-20">
                    {connection.downloadMbps} Mbps
                  </span>
                  <span
                    className="h-2.5 min-w-[3rem] flex-1 overflow-hidden rounded-full bg-muted"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{
                        width: `${Math.max((connection.downloadMbps / fastest) * 100, 2)}%`,
                      }}
                    />
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {connection.uploadMbps}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {connection.latencyMs} ms
              </td>
              <td className="px-4 py-3 text-right">
                <span className="tabular-nums text-muted-foreground">
                  {n(connection.sample.tests)}
                </span>
                {connection.sample.strength === 'thin' && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-warning">
                    <TriangleAlert className="size-3.5" strokeWidth={2} aria-hidden="true" />
                    thin
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
