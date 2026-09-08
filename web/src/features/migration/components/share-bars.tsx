import React from 'react';
import type { MigrationBreakdown } from '../schemas';

const DIMENSION_TITLE: Record<MigrationBreakdown['dimension'], string> = {
  reason: 'Why people left',
  age: 'Age when they left',
  destination: 'Where they went',
  occupation: 'Main source of income',
  village_condition: 'What happened to the villages',
};

/**
 * One dimension as horizontal bars.
 *
 * A single series measuring magnitude, so it takes ONE hue rather than a categorical
 * palette — the categories are named by their own labels, and colouring eight bars eight
 * ways would imply an identity the data does not have. No legend for a single series; the
 * heading names it. Values are labelled directly, in text tokens rather than the bar colour.
 *
 * Bars keep the report's printed order rather than sorting by size, so that a category sits
 * in the same place when the reader moves between two districts. Sorting by value is what
 * makes two district pages impossible to compare.
 */
export function ShareBars({ breakdown }: { breakdown: MigrationBreakdown }) {
  const { values, isShare } = breakdown;
  // Shares are read against a fixed 100; counts against the largest bar present, since a
  // village count has no natural ceiling.
  const scale = isShare ? 100 : Math.max(...values.map((value) => value.value), 1);

  return (
    <section aria-labelledby={`dim-${breakdown.dimension}`}>
      <h4
        id={`dim-${breakdown.dimension}`}
        className="mb-3 text-sm font-semibold tracking-tight text-text-light"
      >
        {DIMENSION_TITLE[breakdown.dimension]}
      </h4>
      <ul className="space-y-2">
        {values.map((value) => (
          <li key={value.categoryKey} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3">
            <span className="truncate text-sm text-muted-foreground" title={value.note ?? undefined}>
              {value.label.en}
            </span>
            <span className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-accent"
                style={{ width: `${Math.max((value.value / scale) * 100, 1.5)}%` }}
              />
            </span>
            <span className="tabular-nums text-sm font-medium text-text-light">
              {isShare ? `${value.value.toFixed(2)}%` : value.value.toLocaleString('en-IN')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
