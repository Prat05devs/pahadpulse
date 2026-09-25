import Link from 'next/link';
import {
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Database,
  MapPinned,
  Route,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { StateOverview } from '@/features/dashboard/types';
import type { BudgetReport } from '@/features/governance/schemas';

import type { IndicatorCoverageRow, SectorCoverage } from '../model';

interface SummaryCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}

function SummaryCard({ label, value, detail, icon: Icon }: SummaryCardProps) {
  return (
    <article className="surface-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-text-light">
            {value}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
        </div>
        <Icon className="size-5 shrink-0 text-accent" strokeWidth={1.8} aria-hidden="true" />
      </div>
    </article>
  );
}

interface ToolLinkProps {
  title: string;
  description: string;
  href: string;
  action: string;
  icon: LucideIcon;
}

function ToolLink({ title, description, href, action, icon: Icon }: ToolLinkProps) {
  return (
    <article className="surface-card flex h-full flex-col p-4 sm:p-5">
      <span className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h3 className="mt-4 font-semibold text-text-light">{title}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-accent hover:underline"
      >
        {action}
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

function formatStateValue(value: number | null, unit: 'count' | 'percent' | 'sq_km'): string {
  if (value === null) return 'Unavailable';
  if (unit === 'percent') return `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;
  if (unit === 'sq_km') return `${value.toLocaleString('en-IN')} km²`;
  return value.toLocaleString('en-IN');
}

interface IntelligenceOverviewProps {
  rows: IndicatorCoverageRow[];
  sectors: SectorCoverage[];
  overview: StateOverview | null;
  budget: BudgetReport | null;
}

export function IntelligenceOverview({
  rows,
  sectors,
  overview,
  budget,
}: IntelligenceOverviewProps) {
  const complete = rows.filter(
    (row) => row.status === 'comparable' || row.status === 'context'
  ).length;
  const vintageYears = rows.flatMap((row) =>
    row.vintage === null ? [] : [row.vintage.slice(0, 4)]
  );
  const newestVintage = vintageYears.sort().at(-1) ?? '—';
  const hasBudget = (budget?.departments.length ?? 0) > 0;

  return (
    <div className="space-y-8">
      <section aria-labelledby="intelligence-summary-heading">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            Evidence base
          </p>
          <h2
            id="intelligence-summary-heading"
            className="mt-1 text-xl font-semibold text-text-light"
          >
            What the platform can support today
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Indicators catalogued"
            value={rows.length.toLocaleString('en-IN')}
            detail="State and district measures"
            icon={Database}
          />
          <SummaryCard
            label="Full district coverage"
            value={complete.toLocaleString('en-IN')}
            detail="Comparable or contextual across all 13 districts"
            icon={Building2}
          />
          <SummaryCard
            label="Sectors represented"
            value={sectors.length.toLocaleString('en-IN')}
            detail="Coverage is shown sector by sector below"
            icon={BarChart3}
          />
          <SummaryCard
            label="Newest statistical vintage"
            value={newestVintage}
            detail={
              !hasBudget || budget?.fiscalYear === null || budget === null
                ? 'Budget year unavailable'
                : `Budget estimates ${budget.fiscalYear}`
            }
            icon={ShieldCheck}
          />
        </div>
      </section>

      {overview !== null ? (
        <section className="surface-card overflow-hidden" aria-labelledby="state-baseline-heading">
          <div className="border-b border-border p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              State baseline
            </p>
            <h2 id="state-baseline-heading" className="mt-1 text-lg font-semibold text-text-light">
              Uttarakhand at a glance
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Each figure keeps its own vintage; values shown together are not assumed to describe
              the same year.
            </p>
          </div>
          <dl className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 xl:grid-cols-6">
            {[
              [
                'Population',
                formatStateValue(overview.population.value, 'count'),
                overview.population.vintage,
              ],
              [
                'Area',
                formatStateValue(overview.areaKmSq.value, 'sq_km'),
                overview.areaKmSq.vintage,
              ],
              [
                'Literacy',
                formatStateValue(overview.literacy.value, 'percent'),
                overview.literacy.vintage,
              ],
              [
                'Districts',
                formatStateValue(overview.districts.value, 'count'),
                overview.districts.vintage,
              ],
              [
                'Forest cover',
                formatStateValue(overview.forestCoverage.value, 'percent'),
                overview.forestCoverage.vintage,
              ],
              [
                'Villages',
                formatStateValue(overview.villages.value, 'count'),
                overview.villages.vintage,
              ],
            ].map(([label, value, vintage]) => (
              <div key={label} className="min-w-0 p-4">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-text-light">
                  {value}
                </dd>
                <dd className="mt-1 text-[0.68rem] text-muted-foreground">
                  {vintage === null ? 'Derived/current geography' : `As of ${vintage.slice(0, 4)}`}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section aria-labelledby="tools-by-audience-heading">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            Public utility
          </p>
          <h2 id="tools-by-audience-heading" className="mt-1 text-xl font-semibold text-text-light">
            Use the data for a real task
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            The source data stays public; these tools make it easier to answer a practical question.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ToolLink
            title="For residents"
            description="Open a district profile, check local indicators and see active public warnings in one place."
            href="/districts"
            action="Explore districts"
            icon={Users}
          />
          <ToolLink
            title="For travellers"
            description="Check road conditions first, then move into weather, river and tourism information before a journey."
            href="/roads"
            action="Check travel conditions"
            icon={Route}
          />
          <ToolLink
            title="For administration"
            description="Review allocations, lower-half district signals and warnings without losing source or vintage context."
            href="/governance"
            action="Open governance view"
            icon={MapPinned}
          />
          <ToolLink
            title="For research & business"
            description="Benchmark two districts and inspect the evidence used by the business-potential engine."
            href="/compare"
            action="Compare districts"
            icon={BriefcaseBusiness}
          />
        </div>
      </section>
    </div>
  );
}
