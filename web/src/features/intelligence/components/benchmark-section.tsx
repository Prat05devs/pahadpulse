import Link from 'next/link';
import { ArrowUpRight, GitCompareArrows } from 'lucide-react';

import { formatRankedValue, formatVintage } from '@/features/governance/format';

import type { BenchmarkDistrict, BenchmarkRow } from '../model';

function names(rows: BenchmarkDistrict[]): string {
  if (rows.length === 0) return '—';
  if (rows.length <= 2) return rows.map((row) => row.name).join(' & ');
  return `${rows[0]?.name ?? '—'} +${rows.length - 1}`;
}

interface BenchmarkSectionProps {
  benchmarks: BenchmarkRow[];
}

export function BenchmarkSection({ benchmarks }: BenchmarkSectionProps) {
  return (
    <section className="space-y-4" aria-labelledby="benchmark-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            District benchmark
          </p>
          <h2 id="benchmark-heading" className="mt-1 text-xl font-semibold text-text-light">
            Where the current evidence separates districts
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            A concise view of the fully covered, directional indicators. Ties are kept as ties.
          </p>
        </div>
        <Link
          href="/compare"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-accent transition-colors hover:bg-surface-hover"
        >
          <GitCompareArrows className="size-4" aria-hidden="true" />
          Open comparison tool
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="surface-card overflow-hidden">
        {benchmarks.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            Comparable district evidence is unavailable.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <caption className="sr-only">
                Leading and trailing districts by comparable indicator
              </caption>
              <thead className="bg-muted/60 text-left text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Indicator
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Leader
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Trailing
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Vintage
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {benchmarks.map((row) => {
                  const leader = row.leaders[0];
                  const trailer = row.trailers[0];
                  return (
                    <tr key={row.key} className="transition-colors hover:bg-surface-hover/70">
                      <th scope="row" className="px-4 py-3 text-left font-medium text-text-light">
                        {row.label}
                      </th>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="font-medium text-success">{names(row.leaders)}</span>
                        {leader !== undefined ? (
                          <span className="ml-1">({formatRankedValue(leader.item)})</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="font-medium text-text-light">{names(row.trailers)}</span>
                        {trailer !== undefined ? (
                          <span className="ml-1">({formatRankedValue(trailer.item)})</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted-foreground">
                        {formatVintage(row.vintage)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          “Leader” is relative to the other Uttarakhand districts on the vintage shown. It is not a
          causal finding, service-quality audit or forecast.
        </p>
      </div>
    </section>
  );
}
