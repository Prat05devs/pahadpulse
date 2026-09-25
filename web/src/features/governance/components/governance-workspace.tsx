import { Database, Map as MapIcon } from 'lucide-react';

import { TerrainMap } from '@/features/map';

import type { GovernanceWorkspaceData } from '../workspace-data';
import { BudgetAllocationSection } from './budget-allocation-section';
import { DistrictEvidenceSection } from './district-evidence-section';
import { GovernanceOverview } from './governance-overview';

interface GovernanceWorkspaceProps {
  data: GovernanceWorkspaceData;
}

export function GovernanceWorkspace({ data }: GovernanceWorkspaceProps) {
  const statePopulation = data.overview?.population.value;

  return (
    <div className="min-h-full">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-accent">
              Coordination workspace
            </span>
            <span className="rounded-full border border-border bg-bg-light px-2.5 py-1 text-[0.68rem] font-medium text-muted-foreground">
              Public data
            </span>
          </div>
          <h1 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] text-text-light sm:text-3xl md:text-4xl">
            Governance command view
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            One decision surface for Uttarakhand&rsquo;s departmental allocations, district signals
            and active public warnings—with the scope and source of every figure kept visible.
          </p>
          {statePopulation !== null && statePopulation !== undefined ? (
            <p className="mt-3 text-xs text-muted-foreground">
              State context: {statePopulation.toLocaleString('en-IN')} residents in the latest
              population figure held by the platform.
            </p>
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:px-6 md:space-y-12 md:py-8 lg:px-8">
        <GovernanceOverview data={data} />
        <BudgetAllocationSection budget={data.budget} />
        <DistrictEvidenceSection standing={data.standing} />

        <section className="space-y-4" aria-labelledby="governance-map-heading">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              Spatial view
            </p>
            <h2 id="governance-map-heading" className="mt-1 text-xl font-semibold text-text-light">
              Districts and warning extent
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Boundaries provide geographic context. A shaded district can represent an area named
              by a warning, not necessarily the authority&rsquo;s exact hazard footprint.
            </p>
          </div>

          {data.districtFeatures === null ? (
            <div className="surface-card flex items-start gap-3 p-5" role="alert">
              <MapIcon className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-text-light">Map data is unavailable</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  The budget and district tables remain available above.
                </p>
              </div>
            </div>
          ) : (
            <TerrainMap districts={data.districtFeatures} alerts={data.alertFeatures} />
          )}
        </section>

        <section
          className="surface-card flex items-start gap-3 p-4 sm:p-5"
          aria-labelledby="method-note-heading"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning">
            <Database className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="method-note-heading" className="font-semibold text-text-light">
              Read rankings as prompts for investigation
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Lower-half placement means only that a district ranks below other Uttarakhand
              districts on a published figure of the vintage shown. Several datasets are older, and
              available district data is uneven across sectors. No composite score or policy
              recommendation is invented where the evidence does not support one.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
