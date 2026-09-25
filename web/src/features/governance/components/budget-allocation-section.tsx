import Link from 'next/link';
import { ArrowUpRight, CalendarRange, ExternalLink, ReceiptIndianRupee } from 'lucide-react';

import { formatCrore } from '../format';
import type { BudgetReport } from '../schemas';

interface BudgetAllocationSectionProps {
  budget: BudgetReport | null;
}

function yearChange(current: number, previous: number | undefined): string {
  if (previous === undefined || previous === 0) return '—';
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
}

export function BudgetAllocationSection({ budget }: BudgetAllocationSectionProps) {
  if (budget === null || budget.fiscalYear === null) {
    return (
      <section className="space-y-3" aria-labelledby="budget-allocation-heading">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Public finance</p>
          <h2 id="budget-allocation-heading" className="mt-1 text-xl font-semibold text-text-light">Budget explorer</h2>
        </div>
        <div className="surface-card p-5" role="alert">
          <p className="text-sm leading-relaxed text-muted-foreground">
            The official budget dataset could not be loaded. The rest of the governance workspace remains available while the data service reconnects.
          </p>
        </div>
      </section>
    );
  }

  const summary = budget.summary;
  const revenueTotal = budget.departments.reduce((sum, item) => sum + item.revenue.voted + item.revenue.charged, 0);
  const capitalTotal = budget.departments.reduce((sum, item) => sum + item.capital.voted + item.capital.charged, 0);
  const chargedTotal = budget.departments.reduce((sum, item) => sum + item.revenue.charged + item.capital.charged, 0);
  const topDepartments = budget.departments.slice(0, 8);
  const topFiveShare = budget.departments.slice(0, 5).reduce((sum, department) => sum + department.share, 0);
  const historyAscending = [...budget.history].reverse();
  const maximumOutlay = Math.max(...budget.history.map((year) => year.totalExpenditure), 1);

  return (
    <section className="space-y-5" aria-labelledby="budget-allocation-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Public finance</p>
          <h2 id="budget-allocation-heading" className="mt-1 text-xl font-semibold text-text-light">Budget explorer</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Compare nineteen official budget estimates, then inspect demand-wise provisions where the source publishes a compatible table. Allocations are not actual expenditure.
          </p>
        </div>

        <form action="/governance" className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Financial year
            <select name="budgetYear" defaultValue={budget.fiscalYear} className="min-h-11 min-w-36 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-text-light outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {budget.availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <button type="submit" className="min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
            View year
          </button>
        </form>
      </div>

      {summary === null ? (
        <div className="surface-card p-5" role="alert">
          <p className="text-sm text-muted-foreground">No official summary is held for {budget.fiscalYear}. Choose one of the archived years.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <BudgetMetric label="Total budget estimate" value={summary.totalExpenditure} />
            <BudgetMetric label="Revenue expenditure" value={summary.revenueExpenditure} />
            <BudgetMetric label="Capital expenditure" value={summary.capitalExpenditure} />
            <BudgetMetric label="Total receipts" value={summary.totalReceipts} />
          </div>

          <div className="surface-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-accent/10 text-accent"><CalendarRange className="size-5" aria-hidden="true" /></span>
                <div>
                  <h3 className="font-semibold text-text-light">Historical budget estimates</h3>
                  <p id="budget-history-description" className="text-xs text-muted-foreground">Current-year budget estimate from each annual document; amounts in crore.</p>
                </div>
              </div>
              <a href="https://budget.uk.gov.in/budgets/" target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-accent transition-colors hover:bg-surface-hover">
                Official archive <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </div>
            <div className="max-h-[30rem] overflow-auto">
              <table className="w-full min-w-[44rem] border-collapse text-sm" aria-describedby="budget-history-description">
                <caption className="sr-only">Uttarakhand budget estimate history from 2008-09 to 2026-27</caption>
                <thead className="sticky top-0 z-10 bg-muted text-left text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Year</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Revenue</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Capital</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Total outlay</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Year change</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Coverage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyAscending.map((year, index) => {
                    const selected = year.fiscalYear === budget.fiscalYear;
                    const hasDemandTable = Number(year.fiscalYear.slice(0, 4)) >= 2018;
                    return (
                      <tr key={year.fiscalYear} className={selected ? 'bg-accent/10' : undefined}>
                        <th scope="row" className="px-4 py-3 text-left">
                          <Link href={`/governance?budgetYear=${year.fiscalYear}#budget-allocation-heading`} className="font-semibold text-accent hover:underline" aria-current={selected ? 'true' : undefined}>{year.fiscalYear}</Link>
                        </th>
                        <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">{formatCrore(year.revenueExpenditure)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">{formatCrore(year.capitalExpenditure)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-xs font-semibold tabular-nums text-text-light">{formatCrore(year.totalExpenditure)}</span>
                          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true"><span className="block h-full rounded-full bg-accent" style={{ width: `${(year.totalExpenditure / maximumOutlay) * 100}%` }} /></span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">{yearChange(year.totalExpenditure, historyAscending[index - 1]?.totalExpenditure)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{hasDemandTable ? 'Summary + 31 demands' : 'State summary'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {budget.departments.length === 0 ? (
        <div className="surface-card flex items-start gap-3 p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning"><ReceiptIndianRupee className="size-5" aria-hidden="true" /></span>
          <div>
            <h3 className="font-semibold text-text-light">State summary available</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              The {budget.fiscalYear} Budget at a Glance uses an older presentation and does not provide the comparable 31-demand table used below for 2018-19 onward. No departmental values have been inferred.
            </p>
            {summary !== null ? <a href={summary.documentUrl} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:underline">Open the {budget.fiscalYear} source PDF <ArrowUpRight className="size-4" aria-hidden="true" /></a> : null}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(20rem,0.85fr)_minmax(0,1.65fr)]">
          <div className="surface-card p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent/10 text-accent"><ReceiptIndianRupee className="size-5" aria-hidden="true" /></span>
              <div>
                <h3 className="font-semibold text-text-light">Largest allocations</h3>
                <p className="text-xs text-muted-foreground">Top five account for {topFiveShare.toFixed(1)}% of the demand total</p>
              </div>
            </div>
            <ol className="mt-5 space-y-4">
              {topDepartments.map((department) => (
                <li key={department.demandNo}>
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0 font-medium leading-snug text-text-light">{department.name}</span>
                    <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-text-light">{formatCrore(department.total)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-accent" style={{ width: `${department.share}%` }} /></div>
                  <p className="mt-1 text-right text-[0.68rem] tabular-nums text-muted-foreground">{department.share.toFixed(2)}% of demand total</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="surface-card overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4 sm:px-5">
              <div>
                <h3 className="font-semibold text-text-light">All demands for grants · {budget.fiscalYear}</h3>
                <p id="budget-table-description" className="mt-1 text-xs leading-relaxed text-muted-foreground">Voted and charged provisions remain separate. Amounts are displayed in crore.</p>
              </div>
              {summary !== null ? <a href={summary.documentUrl} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:underline">Source PDF <ExternalLink className="size-4" aria-hidden="true" /></a> : null}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] border-collapse text-sm" aria-describedby="budget-table-description">
                <caption className="sr-only">Uttarakhand department budget estimates for {budget.fiscalYear}</caption>
                <thead className="bg-muted/60 text-left text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Demand</th><th scope="col" className="px-4 py-3 font-semibold">Department</th><th scope="col" className="px-4 py-3 text-right font-semibold">Revenue</th><th scope="col" className="px-4 py-3 text-right font-semibold">Capital</th><th scope="col" className="px-4 py-3 text-right font-semibold">Charged</th><th scope="col" className="px-4 py-3 text-right font-semibold">Total</th><th scope="col" className="px-4 py-3 text-right font-semibold">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {budget.departments.map((department) => {
                    const revenue = department.revenue.voted + department.revenue.charged;
                    const capital = department.capital.voted + department.capital.charged;
                    const charged = department.revenue.charged + department.capital.charged;
                    return (
                      <tr key={department.demandNo} className="transition-colors hover:bg-surface-hover/70">
                        <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted-foreground">{department.demandNo.toString().padStart(2, '0')}</td><th scope="row" className="px-4 py-3 text-left font-medium text-text-light">{department.name}</th><td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">{formatCrore(revenue)}</td><td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">{formatCrore(capital)}</td><td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">{formatCrore(charged)}</td><td className="px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums text-text-light">{formatCrore(department.total)}</td><td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">{department.share.toFixed(2)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-border bg-muted/40 font-semibold text-text-light">
                  <tr><th scope="row" colSpan={2} className="px-4 py-3 text-left">Demand total</th><td className="px-4 py-3 text-right font-mono text-xs tabular-nums">{formatCrore(revenueTotal)}</td><td className="px-4 py-3 text-right font-mono text-xs tabular-nums">{formatCrore(capitalTotal)}</td><td className="px-4 py-3 text-right font-mono text-xs tabular-nums">{formatCrore(chargedTotal)}</td><td className="px-4 py-3 text-right font-mono text-xs tabular-nums">{formatCrore(budget.departmentTotal)}</td><td className="px-4 py-3 text-right font-mono text-xs tabular-nums">100%</td></tr>
                </tfoot>
              </table>
            </div>
            <p className="border-t border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground sm:px-5">
              {summary?.provenance?.attribution ?? 'Source: Budget Directorate, Government of Uttarakhand'}. Stored in thousands of rupees as published. Small differences from the headline can reflect its two-decimal crore rounding.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function BudgetMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums text-text-light">{formatCrore(value)}</p>
    </div>
  );
}
