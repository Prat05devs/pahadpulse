import Link from 'next/link';
import { Database, ExternalLink, ShieldCheck } from 'lucide-react';

import {
  buildBenchmarkRows,
  buildCoverageRows,
  buildSectorCoverage,
  type IntelligenceFilters,
} from '../model';
import type { IntelligenceWorkspaceData } from '../workspace-data';
import { BenchmarkSection } from './benchmark-section';
import { BudgetIntelligence } from './budget-intelligence';
import { IndicatorCatalogue } from './indicator-catalogue';
import { IntelligenceOverview } from './intelligence-overview';
import { SectorCoverage } from './sector-coverage';

interface IntelligenceWorkspaceProps {
  data: IntelligenceWorkspaceData;
  filters: IntelligenceFilters;
}

export function IntelligenceWorkspace({ data, filters }: IntelligenceWorkspaceProps) {
  const coverageRows = buildCoverageRows(data.catalogue ?? [], data.standing);
  const sectors = buildSectorCoverage(coverageRows);
  const benchmarks = buildBenchmarkRows(data.standing);

  return (
    <div className="min-h-full">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-accent">
              Public intelligence
            </span>
            <span className="rounded-full border border-border bg-bg-light px-2.5 py-1 text-[0.68rem] font-medium text-muted-foreground">
              Registered public evidence
            </span>
          </div>
          <h1 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] text-text-light sm:text-3xl md:text-4xl">
            Uttarakhand intelligence studio
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Explore what public data can answer today, compare districts on like-for-like figures,
            inspect budget structure and find the right tool for residents, travellers, researchers,
            businesses and administration.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:px-6 md:space-y-12 md:py-8 lg:px-8">
        <div className="surface-card flex items-start gap-3 p-4" role="note">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="text-text-light">
              Source facts and derived views stay separate.
            </strong>{' '}
            Values are reproduced from registered public sources with their vintage. Coverage
            labels, relative district ranks and budget shares are calculations by Pahad Pulse and
            are identified as such.
          </p>
        </div>

        <IntelligenceOverview
          rows={coverageRows}
          sectors={sectors}
          overview={data.overview}
          budget={data.budget}
        />
        <SectorCoverage sectors={sectors} />
        <IndicatorCatalogue rows={coverageRows} filters={filters} />
        <BenchmarkSection benchmarks={benchmarks} />
        <BudgetIntelligence budget={data.budget} />

        <section
          className="surface-card grid gap-4 p-4 sm:p-5 lg:grid-cols-[auto_1fr_auto] lg:items-center"
          aria-labelledby="provenance-heading"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-info-soft text-info">
            <Database className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="provenance-heading" className="font-semibold text-text-light">
              Verify before you reuse
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Open the source registry to inspect the publishing department, source URL,
              redistribution status and freshness notes behind platform data.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sources"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
            >
              Source registry
            </Link>
            <a
              href="https://budget.uk.gov.in/budget-2026-27/"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
            >
              Official budget
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
