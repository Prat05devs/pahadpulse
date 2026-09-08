import React from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, Clock3, Minus } from 'lucide-react';
import type { StateMigration } from '../schemas';

const n = (value: number) => value.toLocaleString('en-IN');

function Direction({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-sm text-muted-foreground">Not comparable</span>;
  }
  const Icon = value === 0 ? Minus : value < 0 ? ArrowDownRight : ArrowUpRight;
  const tone = value === 0 ? 'text-muted-foreground' : value < 0 ? 'text-success' : 'text-danger';
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium tabular-nums ${tone}`}>
      <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
      {`${value > 0 ? '+' : ''}${n(value)}`}
    </span>
  );
}

/**
 * Every district's counts in both rounds.
 *
 * A table rather than a chart: thirteen districts against two rounds and a signed change is
 * a lookup ("what about mine?") far more often than it is a shape, and the exact figures are
 * the point — this is a government count, and rounding it into a bar would lose the thing a
 * reader came to check.
 *
 * Districts with no figures keep their row and say so. Dropping them would leave a reader to
 * infer that a missing district had no migration, which is the opposite of what is known.
 */
export function StateMigrationTable({ data }: { data: StateMigration }) {
  const first = data.surveys[0];
  const last = data.surveys[data.surveys.length - 1];

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[46rem] text-sm">
        <caption className="sr-only">
          Temporary and permanent out-migration by district, in both commission survey rounds
        </caption>
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-4 py-3 font-medium">District</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Temporary {first?.coversTo.slice(0, 4)}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Temporary {last?.coversTo.slice(0, 4)}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Change</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Permanent {first?.coversTo.slice(0, 4)}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Permanent {last?.coversTo.slice(0, 4)}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          {data.districts.map((district) => {
            const byKey = new Map(district.figures.map((figure) => [figure.surveyKey, figure]));
            const earlier = first === undefined ? undefined : byKey.get(first.key);
            const later = last === undefined ? undefined : byKey.get(last.key);

            return (
              <tr key={district.slug} className="border-b border-border last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  <Link
                    className="underline-offset-2 hover:underline"
                    href={`/districts/${district.slug}`}
                  >
                    {district.name.en}
                  </Link>
                </th>
                {district.coverage === 'not_yet_available' ? (
                  <td className="px-4 py-3 text-muted-foreground" colSpan={6}>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="size-4" strokeWidth={1.8} aria-hidden="true" />
                      Being compiled — no published figures for this district yet
                    </span>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {earlier === undefined ? '—' : n(earlier.temporaryPersons)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {later === undefined ? '—' : n(later.temporaryPersons)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Direction value={district.change?.temporaryPersons ?? null} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {earlier === undefined ? '—' : n(earlier.permanentPersons)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {later === undefined ? '—' : n(later.permanentPersons)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Direction value={district.change?.permanentPersons ?? null} />
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
