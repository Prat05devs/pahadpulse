import Link from 'next/link';
import { ArrowUpRight, Landmark } from 'lucide-react';

import { formatCrore } from '@/features/governance/format';
import type { BudgetReport } from '@/features/governance/schemas';

interface BudgetIntelligenceProps {
  budget: BudgetReport | null;
}

export function BudgetIntelligence({ budget }: BudgetIntelligenceProps) {
  if (budget === null || budget.fiscalYear === null || budget.departments.length === 0) {
    return (
      <section className="space-y-3" aria-labelledby="budget-intelligence-heading">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            Budget lens
          </p>
          <h2
            id="budget-intelligence-heading"
            className="mt-1 text-xl font-semibold text-text-light"
          >
            Allocation structure
          </h2>
        </div>
        <div className="surface-card p-5 text-sm text-muted-foreground">
          Budget intelligence is unavailable. No values have been inferred from secondary reporting.
        </div>
      </section>
    );
  }

  const revenue = budget.departments.reduce(
    (sum, item) => sum + item.revenue.voted + item.revenue.charged,
    0
  );
  const capital = budget.departments.reduce(
    (sum, item) => sum + item.capital.voted + item.capital.charged,
    0
  );
  const capitalShare = budget.total === 0 ? 0 : (capital / budget.total) * 100;
  const topFive = budget.departments.slice(0, 5);
  const history = [...budget.history].reverse();
  const earliest = history[0];
  const latest = history.at(-1);
  const previous = history.at(-2);
  const yearsBetween = Math.max(history.length - 1, 1);
  const annualisedGrowth =
    earliest === undefined || latest === undefined || earliest.totalExpenditure === 0
      ? null
      : (Math.pow(latest.totalExpenditure / earliest.totalExpenditure, 1 / yearsBetween) - 1) *
        100;
  const latestChange =
    latest === undefined || previous === undefined || previous.totalExpenditure === 0
      ? null
      : ((latest.totalExpenditure - previous.totalExpenditure) / previous.totalExpenditure) * 100;
  const maximumHistoricalOutlay = Math.max(
    ...history.map((year) => year.totalExpenditure),
    1
  );

  return (
    <section className="space-y-4" aria-labelledby="budget-intelligence-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            Budget lens
          </p>
          <h2
            id="budget-intelligence-heading"
            className="mt-1 text-xl font-semibold text-text-light"
          >
            Allocation structure
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            A compact analytical view of {budget.fiscalYear} demand-wise estimates. The full table
            remains in Governance.
          </p>
        </div>
        <Link
          href="/governance#budget-allocation-heading"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-accent transition-colors hover:bg-surface-hover"
        >
          Open full budget table
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.4fr)]">
        <article className="surface-card p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Landmark className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Total budget estimates</p>
              <p className="font-display text-2xl font-semibold tabular-nums text-text-light">
                {formatCrore(budget.total)}
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="flex h-3">
              <span className="bg-accent" style={{ width: `${100 - capitalShare}%` }} />
              <span className="bg-info" style={{ width: `${capitalShare}%` }} />
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-accent" aria-hidden="true" /> Revenue
              </dt>
              <dd className="mt-1 font-mono text-xs font-semibold tabular-nums text-text-light">
                {formatCrore(revenue)}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-info" aria-hidden="true" /> Capital
              </dt>
              <dd className="mt-1 font-mono text-xs font-semibold tabular-nums text-text-light">
                {formatCrore(capital)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Capital provision is {capitalShare.toFixed(1)}% of the total. This is a composition of
            allocations, not a measure of spending quality or completion.
          </p>
        </article>

        <div className="surface-card overflow-hidden">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h3 className="font-semibold text-text-light">Five largest demands</h3>
          </div>
          <ol className="divide-y divide-border">
            {topFive.map((department, index) => (
              <li
                key={department.demandNo}
                className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5"
              >
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-light">{department.name}</p>
                  <div
                    className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${department.share}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-semibold tabular-nums text-text-light">
                    {formatCrore(department.total)}
                  </p>
                  <p className="mt-0.5 text-[0.68rem] tabular-nums text-muted-foreground">
                    {department.share.toFixed(2)}%
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="border-t border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground sm:px-5">
            Demands are administrative budget groupings. They should not be read as a direct ranking
            of policy priority or service impact.
          </p>
        </div>
      </div>

      {earliest !== undefined && latest !== undefined ? (
        <article className="surface-card overflow-hidden">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <h3 className="font-semibold text-text-light">Long-run budget trend</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Published budget estimates, not inflation-adjusted and not actual expenditure.
            </p>
          </div>
          <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(15rem,0.55fr)_minmax(0,1.45fr)]">
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">{earliest.fiscalYear}</dt>
                <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-text-light">
                  {formatCrore(earliest.totalExpenditure)}
                </dd>
              </div>
              <div className="rounded-lg bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">{latest.fiscalYear}</dt>
                <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-text-light">
                  {formatCrore(latest.totalExpenditure)}
                </dd>
              </div>
              <div className="rounded-lg bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">Annualised growth</dt>
                <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-text-light">
                  {annualisedGrowth === null ? '—' : `${annualisedGrowth.toFixed(1)}%`}
                </dd>
              </div>
              <div className="rounded-lg bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">Latest year change</dt>
                <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-text-light">
                  {latestChange === null ? '—' : `${latestChange >= 0 ? '+' : ''}${latestChange.toFixed(1)}%`}
                </dd>
              </div>
            </dl>

            <div>
              <p className="sr-only">
                Total budget estimates rise from {formatCrore(earliest.totalExpenditure)} in {earliest.fiscalYear} to {formatCrore(latest.totalExpenditure)} in {latest.fiscalYear}.
              </p>
              <ol
                className="grid h-40 items-end gap-1"
                style={{ gridTemplateColumns: `repeat(${history.length}, minmax(0, 1fr))` }}
                aria-hidden="true"
              >
                {history.map((year) => (
                  <li key={year.fiscalYear} className="group relative flex h-full items-end">
                    <span className="w-full rounded-t-sm bg-accent/75 transition-colors group-hover:bg-accent" style={{ height: `${Math.max((year.totalExpenditure / maximumHistoricalOutlay) * 100, 4)}%` }} />
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-text-light px-2 py-1 text-[0.65rem] font-medium text-bg-light shadow-lg group-hover:block">
                      {year.fiscalYear}: {formatCrore(year.totalExpenditure)}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-2 flex justify-between text-[0.68rem] font-medium text-muted-foreground">
                <span>{earliest.fiscalYear}</span>
                <span>{latest.fiscalYear}</span>
              </div>
            </div>
          </div>
        </article>
      ) : null}
    </section>
  );
}
