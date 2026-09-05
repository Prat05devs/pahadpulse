import React from 'react';
import type { Comparison, ComparisonRow } from '../schemas';
import { formatIndicatorValue } from '../format';

interface ComparisonTableProps {
  comparison: Comparison;
  nameA: string;
  nameB: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  demography: 'Demography',
  education: 'Education',
  health: 'Health',
  economy: 'Economy',
  industry: 'Industry',
  connectivity: 'Connectivity',
};

const DEMO_SOURCE_KEY = 'pahad-pulse-demo-data';

/**
 * Decides which side to mark as the stronger figure.
 *
 * Returns null whenever the question is meaningless, and that is most of the time: an
 * indicator with `higherIsBetter === null` (population, sex ratio) has no better side at all,
 * and two values from different vintages are not comparable even when the same indicator.
 * Colouring a bigger population green would be a claim the data does not make.
 */
function betterSide(row: ComparisonRow): 'A' | 'B' | null {
  const { areaA, areaB, indicator } = row;
  if (areaA === null || areaB === null) return null;
  if (indicator.higherIsBetter === null) return null;
  if (areaA.vintage !== areaB.vintage) return null;
  if (areaA.value === areaB.value) return null;

  const aWins = indicator.higherIsBetter
    ? areaA.value > areaB.value
    : areaA.value < areaB.value;
  return aWins ? 'A' : 'B';
}

function Cell({
  row,
  side,
  highlight,
}: {
  row: ComparisonRow;
  side: 'A' | 'B';
  highlight: 'A' | 'B' | null;
}) {
  const value = side === 'A' ? row.areaA : row.areaB;

  if (value === null) {
    return (
      <td className="px-4 py-3 text-right align-middle text-sm text-muted-foreground">
        No published figure
      </td>
    );
  }

  const isDemo = value.provenance?.sourceKey === DEMO_SOURCE_KEY;
  const isBetter = highlight === side;

  return (
    <td className="px-4 py-3 text-right align-middle">
      <span
        className={`font-mono text-base font-semibold tabular-nums ${
          isBetter ? 'text-success' : ''
        }`}
      >
        {formatIndicatorValue(value.value, row.indicator.unit, row.indicator.decimals)}
      </span>
      <span className="mt-0.5 block text-[11px] text-muted-foreground">
        {value.vintage.slice(0, 4)}
        {isDemo ? ' · demo data' : ''}
      </span>
    </td>
  );
}

export function ComparisonTable({ comparison, nameA, nameB }: ComparisonTableProps) {
  // Grouped by category so a reader scans demography against demography rather than a flat
  // list of unrelated measures.
  const byCategory = new Map<string, ComparisonRow[]>();
  for (const row of comparison.rows) {
    const list = byCategory.get(row.indicator.category) ?? [];
    list.push(row);
    byCategory.set(row.indicator.category, list);
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-hover/60">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Indicator
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold">{nameA}</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">{nameB}</th>
            </tr>
          </thead>

          {[...byCategory.entries()].map(([category, rows]) => (
            <tbody key={category}>
              <tr>
                <th
                  colSpan={3}
                  className="border-y border-border bg-muted/50 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {CATEGORY_LABELS[category] ?? category}
                </th>
              </tr>
              {rows.map((row) => {
                const highlight = betterSide(row);
                const source =
                  row.areaA?.provenance ?? row.areaB?.provenance ?? null;

                return (
                  <tr key={row.indicator.key} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-medium">{row.indicator.label.en}</span>
                      {source !== null && (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {source.sourceKey === DEMO_SOURCE_KEY ? (
                            <span className="text-warning">
                              Demo data — no published figure yet
                            </span>
                          ) : (
                            <a
                              href={source.url ?? '#'}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="underline underline-offset-2 hover:text-text-light"
                            >
                              {source.department.en}
                            </a>
                          )}
                        </span>
                      )}
                    </td>
                    <Cell row={row} side="A" highlight={highlight} />
                    <Cell row={row} side="B" highlight={highlight} />
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>

      <p className="border-t border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        A figure is marked green only where the indicator has a better direction and both
        districts report the same year. Population and sex ratio have no better side, and
        values from different years are not compared.
        {comparison.omittedCount > 0 && (
          <> {comparison.omittedCount} indicator(s) are hidden because neither district has a
          value for them.</>
        )}
      </p>
    </div>
  );
}
