import Link from 'next/link';
import { ArrowUpRight, CircleAlert, Scale } from 'lucide-react';

import type { DistrictStanding, RankedIndicator } from '../schemas';
import { formatRankedValue, formatVintage } from '../format';

interface DistrictEvidenceSectionProps {
  standing: DistrictStanding | null;
}

interface RankedDistrict {
  name: string;
  slug: string;
  item: RankedIndicator;
}

function rankedDistricts(
  standing: DistrictStanding,
  indicatorKey: string
): { leaders: RankedDistrict[]; trailers: RankedDistrict[] } {
  const rows = standing.districts.flatMap((district) => {
    const item = district.ranked.find((candidate) => candidate.key === indicatorKey);
    return item === undefined ? [] : [{ name: district.name, slug: district.slug, item }];
  });
  const lastRank = rows.reduce((maximum, row) => Math.max(maximum, row.item.rank), 0);

  return {
    leaders: rows.filter((row) => row.item.rank === 1),
    trailers: rows.filter((row) => row.item.rank === lastRank),
  };
}

function districtNames(rows: RankedDistrict[]): string {
  if (rows.length === 0) return '—';
  if (rows.length <= 2) return rows.map((row) => row.name).join(' & ');
  return `${rows[0]?.name ?? '—'} +${rows.length - 1}`;
}

export function DistrictEvidenceSection({ standing }: DistrictEvidenceSectionProps) {
  return (
    <section className="space-y-4" aria-labelledby="district-evidence-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            District evidence
          </p>
          <h2 id="district-evidence-heading" className="mt-1 text-xl font-semibold text-text-light">
            Comparable strengths and gaps
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Rankings use one published vintage per indicator and only include indicators that cover
            all 13 districts and declare whether higher or lower is preferable.
          </p>
        </div>
        <Link
          href="/compare"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-accent transition-colors hover:bg-surface-hover"
        >
          Compare two districts
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {standing === null ? (
        <div className="surface-card flex items-start gap-3 p-5" role="alert">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-text-light">District evidence is unavailable</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Budget and warning surfaces remain usable; district rankings have not been inferred.
            </p>
          </div>
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="flex items-start gap-3 border-b border-border p-4 sm:p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Scale className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-semibold text-text-light">Indicator benchmark matrix</h3>
              <p
                id="benchmark-table-description"
                className="mt-1 text-xs leading-relaxed text-muted-foreground"
              >
                “Leading” means rank 1 after applying the indicator&rsquo;s stated direction. It
                does not always mean the numerically largest value.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table
              className="w-full min-w-[48rem] border-collapse text-sm"
              aria-describedby="benchmark-table-description"
            >
              <caption className="sr-only">
                Leading and trailing districts for every fully comparable indicator
              </caption>
              <thead className="bg-muted/60 text-left text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Indicator
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Leading district
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Trailing district
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Vintage
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {standing.used.map((indicator) => {
                  const { leaders, trailers } = rankedDistricts(standing, indicator.key);
                  const leader = leaders[0];
                  const trailer = trailers[0];
                  return (
                    <tr key={indicator.key} className="transition-colors hover:bg-surface-hover/70">
                      <th scope="row" className="px-4 py-3 text-left font-medium text-text-light">
                        {indicator.label}
                      </th>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="font-medium text-success">{districtNames(leaders)}</span>
                        {leader !== undefined ? (
                          <span className="ml-1 tabular-nums">
                            ({formatRankedValue(leader.item)})
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="font-medium text-text-light">
                          {districtNames(trailers)}
                        </span>
                        {trailer !== undefined ? (
                          <span className="ml-1 tabular-nums">
                            ({formatRankedValue(trailer.item)})
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted-foreground">
                        {formatVintage(indicator.vintage)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border bg-muted/30 p-4 sm:px-5">
            <p className="text-xs leading-relaxed text-muted-foreground">
              <strong className="text-text-light">Coverage boundary:</strong> {standing.used.length}{' '}
              indicators are fully comparable. {standing.excluded.length} additional indicators are
              excluded from ranking because they are descriptive or do not cover every district.
            </p>
            {standing.excluded.length > 0 ? (
              <ul
                className="mt-2 flex flex-wrap gap-2"
                aria-label="Indicators excluded from ranking"
              >
                {standing.excluded.map((indicator) => (
                  <li
                    key={indicator.key}
                    className="rounded-full border border-border bg-surface px-2.5 py-1 text-[0.68rem] text-muted-foreground"
                  >
                    {indicator.label} ·{' '}
                    {indicator.reason === 'no-direction' ? 'context only' : 'partial coverage'}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
