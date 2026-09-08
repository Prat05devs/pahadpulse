import React from 'react';
import Link from 'next/link';
import type { PilgrimArrivals } from '../pilgrim-schemas';

const n = (value: number) => value.toLocaleString('en-IN');

/**
 * Yearly arrivals per shrine.
 *
 * A table, not a line chart. Three points cannot carry a trend, and the middle one is a
 * pandemic year — joining them with a line would draw a slope that describes a closure, not
 * a pattern. The years are labelled so the collapse reads as what it was.
 */
export function PilgrimArrivalsTable({ data }: { data: PilgrimArrivals }) {
  const rows = [...data.destinations].sort(
    (a, b) =>
      (b.years[b.years.length - 1]?.visitors ?? 0) - (a.years[a.years.length - 1]?.visitors ?? 0)
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[34rem] text-sm">
        <caption className="sr-only">
          Pilgrim arrivals at the Char Dham shrines and Hemkund Sahib, by year
        </caption>
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-4 py-3 font-medium">
              Shrine
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              District
            </th>
            {data.years.map((year) => (
              <th key={year} scope="col" className="px-4 py-3 text-right font-medium">
                {year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((destination) => {
            const byYear = new Map(destination.years.map((entry) => [entry.year, entry.visitors]));
            return (
              <tr key={destination.slug} className="border-b border-border last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  {destination.name.en}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {destination.name.hi}
                  </span>
                </th>
                <td className="px-4 py-3">
                  <Link
                    className="text-muted-foreground underline-offset-2 hover:text-text-light hover:underline"
                    href={`/districts/${destination.district.slug}`}
                  >
                    {destination.district.name.en}
                  </Link>
                </td>
                {data.years.map((year) => (
                  <td key={year} className="px-4 py-3 text-right tabular-nums">
                    {byYear.has(year) ? n(byYear.get(year) ?? 0) : '—'}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-muted/30 font-semibold">
            <th scope="row" className="px-4 py-3 text-left" colSpan={2}>
              All shrines
            </th>
            {data.years.map((year) => (
              <td key={year} className="px-4 py-3 text-right tabular-nums">
                {n(data.totals.find((total) => total.year === year)?.visitors ?? 0)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
