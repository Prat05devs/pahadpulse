import {
  Activity,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  HeartPulse,
  Hotel,
  Leaf,
  Map,
  RadioTower,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { CATEGORY_LABELS, type SectorCoverage as SectorCoverageModel } from '../model';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  demography: Users,
  education: GraduationCap,
  health: HeartPulse,
  economy: BriefcaseBusiness,
  industry: Building2,
  connectivity: RadioTower,
  development: Target,
  tourism: Hotel,
  geography: Map,
  environment: Leaf,
};

interface SectorCoverageProps {
  sectors: SectorCoverageModel[];
}

export function SectorCoverage({ sectors }: SectorCoverageProps) {
  return (
    <section className="space-y-4" aria-labelledby="sector-coverage-heading">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          Coverage map
        </p>
        <h2 id="sector-coverage-heading" className="mt-1 text-xl font-semibold text-text-light">
          Sector-by-sector data readiness
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          A sector is only marked complete where the latest held vintage covers every district.
          State-level metrics and partial district data are counted separately.
        </p>
      </div>

      {sectors.length === 0 ? (
        <div className="surface-card flex items-start gap-3 p-5" role="alert">
          <Activity className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">The indicator catalogue is unavailable.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sectors.map((sector) => {
            const Icon = CATEGORY_ICONS[sector.category] ?? Activity;
            return (
              <article key={sector.category} className="surface-card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {sector.total} metric{sector.total === 1 ? '' : 's'}
                  </span>
                </div>
                <h3 className="mt-3 font-semibold text-text-light">
                  {CATEGORY_LABELS[sector.category] ?? sector.category}
                </h3>

                {sector.districtTotal > 0 ? (
                  <>
                    <div
                      className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${sector.coveragePercent}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {sector.districtComplete} of {sector.districtTotal} district metrics have full
                      coverage
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    No district-scoped metric in this sector
                  </p>
                )}

                <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/60 p-2.5">
                    <dt className="text-muted-foreground">Partial</dt>
                    <dd className="mt-0.5 font-mono font-semibold tabular-nums text-text-light">
                      {sector.partial}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-2.5">
                    <dt className="text-muted-foreground">State-level</dt>
                    <dd className="mt-0.5 font-mono font-semibold tabular-nums text-text-light">
                      {sector.stateLevel}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-2.5">
                    <dt className="text-muted-foreground">Catalogue only</dt>
                    <dd className="mt-0.5 font-mono font-semibold tabular-nums text-text-light">
                      {sector.catalogueOnly}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-2.5">
                    <dt className="text-muted-foreground">Unavailable</dt>
                    <dd className="mt-0.5 font-mono font-semibold tabular-nums text-text-light">
                      {sector.unavailable}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
