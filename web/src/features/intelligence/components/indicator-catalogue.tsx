import Link from 'next/link';
import { Filter, Search } from 'lucide-react';

import {
  CATEGORY_LABELS,
  COVERAGE_LABELS,
  type CoverageStatus,
  type IndicatorCoverageRow,
  type IntelligenceFilters,
} from '../model';

const STATUS_CLASSES: Record<CoverageStatus, string> = {
  comparable: 'bg-success-soft text-success',
  context: 'bg-info-soft text-info',
  partial: 'bg-warning-soft text-warning',
  state: 'bg-accent/10 text-accent',
  catalogue: 'bg-muted text-muted-foreground',
  unavailable: 'bg-danger-soft text-danger',
};

interface IndicatorCatalogueProps {
  rows: IndicatorCoverageRow[];
  filters: IntelligenceFilters;
}

export function IndicatorCatalogue({ rows, filters }: IndicatorCatalogueProps) {
  const categories = [...new Set(rows.map((row) => row.category))].sort((a, b) =>
    (CATEGORY_LABELS[a] ?? a).localeCompare(CATEGORY_LABELS[b] ?? b)
  );
  const query = filters.q?.toLocaleLowerCase('en-IN') ?? '';
  const filtered = rows.filter((row) => {
    const matchesQuery =
      query.length === 0 ||
      row.label.toLocaleLowerCase('en-IN').includes(query) ||
      row.labelHi.includes(filters.q ?? '') ||
      row.key.includes(query);
    const matchesSector = filters.sector === undefined || row.category === filters.sector;
    const matchesStatus = filters.status === undefined || row.status === filters.status;
    return matchesQuery && matchesSector && matchesStatus;
  });

  return (
    <section className="space-y-4" aria-labelledby="indicator-catalogue-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            Data inventory
          </p>
          <h2
            id="indicator-catalogue-heading"
            className="mt-1 text-xl font-semibold text-text-light"
          >
            Indicator catalogue
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Search what the platform measures, what can be compared today, and where official
            district data is still incomplete.
          </p>
        </div>
        <Link
          href="/sources"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline"
        >
          Inspect source registry
        </Link>
      </div>

      <form
        action="/intelligence"
        method="get"
        className="surface-card grid gap-3 p-4 md:grid-cols-2 md:items-end xl:grid-cols-[minmax(14rem,1fr)_minmax(10rem,0.45fr)_minmax(12rem,0.55fr)_auto]"
      >
        <div>
          <label htmlFor="indicator-search" className="text-xs font-semibold text-text-light">
            Search indicators
          </label>
          <div className="relative mt-1.5">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="indicator-search"
              name="q"
              type="search"
              defaultValue={filters.q}
              placeholder="e.g. literacy or tourism"
              className="min-h-11 w-full rounded-lg border border-border bg-bg-light py-2 pl-9 pr-3 text-sm text-text-light placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div>
          <label htmlFor="indicator-sector" className="text-xs font-semibold text-text-light">
            Sector
          </label>
          <select
            id="indicator-sector"
            name="sector"
            defaultValue={filters.sector ?? ''}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-bg-light px-3 text-sm text-text-light"
          >
            <option value="">All sectors</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category] ?? category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="indicator-status" className="text-xs font-semibold text-text-light">
            Coverage status
          </label>
          <select
            id="indicator-status"
            name="status"
            defaultValue={filters.status ?? ''}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-bg-light px-3 text-sm text-text-light"
          >
            <option value="">All statuses</option>
            {Object.entries(COVERAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-1 xl:flex-nowrap">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <Filter className="size-4" aria-hidden="true" />
            Apply
          </button>
          <Link
            href="/intelligence#indicator-catalogue-heading"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-hover hover:text-text-light"
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
          <p className="text-sm font-medium text-text-light">
            {filtered.length.toLocaleString('en-IN')} of {rows.length.toLocaleString('en-IN')}{' '}
            indicators
          </p>
          <p className="text-xs text-muted-foreground">
            Latin numerals retained for table scanning
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="p-6 text-center">
            <p className="font-medium text-text-light">No indicators match these filters</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a broader term or reset the filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <caption className="sr-only">Indicator catalogue and current coverage status</caption>
              <thead className="bg-muted/60 text-left text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Indicator
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Sector
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Scope
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Coverage
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Vintage
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((row) => (
                  <tr key={row.key} className="transition-colors hover:bg-surface-hover/70">
                    <th scope="row" className="px-4 py-3 text-left">
                      <span className="block font-medium text-text-light">{row.label}</span>
                      <span
                        lang="hi"
                        className="mt-0.5 block text-xs font-normal text-muted-foreground"
                      >
                        {row.labelHi}
                      </span>
                    </th>
                    <td className="px-4 py-3 text-muted-foreground">
                      {CATEGORY_LABELS[row.category] ?? row.category}
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{row.scope}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${STATUS_CLASSES[row.status]}`}
                      >
                        {COVERAGE_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted-foreground">
                      {row.vintage?.slice(0, 4) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
