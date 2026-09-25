import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CircleAlert,
  IndianRupee,
  Landmark,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

import type { GovernanceWorkspaceData } from '../workspace-data';
import { formatCrore, formatRankedValue } from '../format';

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}

function MetricCard({ label, value, detail, icon: Icon }: MetricCardProps) {
  return (
    <article className="surface-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-text-light">
            {value}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

interface GovernanceOverviewProps {
  data: GovernanceWorkspaceData;
}

export function GovernanceOverview({ data }: GovernanceOverviewProps) {
  const budgetDepartments = data.budget?.departments ?? [];
  const hasBudget = budgetDepartments.length > 0;
  const capital = hasBudget
    ? budgetDepartments.reduce(
        (sum, department) => sum + department.capital.voted + department.capital.charged,
        0
      )
    : null;
  const highestNeed = data.standing?.needsAttention[0];

  return (
    <div className="space-y-6">
      <div className="surface-card flex items-start gap-3 p-4" role="note">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
          <ShieldCheck className="size-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-text-light">Public preview</p>
          <p className="mt-1 max-w-4xl text-sm leading-relaxed text-muted-foreground">
            Officer authentication is planned but not active. This workspace currently arranges
            public budget documents, public indicators and public warning feeds; it does not expose
            restricted operational data.
          </p>
        </div>
      </div>

      <section aria-labelledby="governance-snapshot-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              State snapshot
            </p>
            <h2
              id="governance-snapshot-heading"
              className="mt-1 text-xl font-semibold text-text-light"
            >
              Decision context at a glance
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Budget estimates are allocations, not spend
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total budget"
            value={
              !hasBudget || data.budget === null ? 'Unavailable' : formatCrore(data.budget.total)
            }
            detail={
              !hasBudget || data.budget?.fiscalYear === null || data.budget === null
                ? 'Not cleared for display or not loaded'
                : `Budget estimates ${data.budget.fiscalYear}`
            }
            icon={IndianRupee}
          />
          <MetricCard
            label="Capital allocation"
            value={capital === null ? 'Unavailable' : formatCrore(capital)}
            detail="Voted and charged capital provision"
            icon={Landmark}
          />
          <MetricCard
            label="District evidence"
            value={
              data.standing === null ? 'Unavailable' : `${data.standing.districts.length} districts`
            }
            detail={
              data.standing === null
                ? 'Indicator service unavailable'
                : `${data.standing.used.length} comparable indicators`
            }
            icon={Building2}
          />
          <MetricCard
            label="Warnings in force"
            value={
              data.alerts === null ? 'Unavailable' : data.alerts.length.toLocaleString('en-IN')
            }
            detail={
              data.alerts === null
                ? 'Do not interpret this as an all-clear'
                : `${data.recentAlerts?.length ?? 0} lapsed in the last 48 hours`
            }
            icon={AlertTriangle}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        <section className="surface-card overflow-hidden" aria-labelledby="priority-queue-heading">
          <div className="border-b border-border p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              Evidence queue
            </p>
            <h2 id="priority-queue-heading" className="mt-1 text-lg font-semibold text-text-light">
              Districts with the most lower-half signals
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              A triage list for follow-up questions, not an official performance rating.
            </p>
          </div>

          {data.standing === null ? (
            <p className="p-5 text-sm text-muted-foreground">District evidence is unavailable.</p>
          ) : (
            <ol className="divide-y divide-border">
              {data.standing.needsAttention.slice(0, 5).map((district, index) => {
                const signal = district.worst[0];
                return (
                  <li key={district.slug} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className="font-medium text-text-light">{district.name}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {district.bottomHalf}/{district.of} lower-half signals
                        </p>
                      </div>
                      {signal !== undefined ? (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          Lowest signal: {signal.label} · {formatRankedValue(signal)} · rank{' '}
                          {signal.rank}/{signal.of}
                        </p>
                      ) : null}
                    </div>
                    <Link
                      href={`/districts/${district.slug}`}
                      aria-label={`Open ${district.name} district profile`}
                      className="flex size-11 shrink-0 items-center justify-center rounded-lg text-accent transition-colors hover:bg-accent/10"
                    >
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="surface-card overflow-hidden" aria-labelledby="warning-feed-heading">
          <div className="border-b border-border p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              Live feed
            </p>
            <h2 id="warning-feed-heading" className="mt-1 text-lg font-semibold text-text-light">
              Warnings in force
            </h2>
          </div>

          {data.alerts === null ? (
            <div className="flex items-start gap-3 p-5" role="alert">
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                The warning feed could not be loaded. This is a page failure, not an all-clear.
              </p>
            </div>
          ) : data.alerts.length === 0 ? (
            <div className="p-5">
              <p className="text-sm font-medium text-text-light">No warnings currently in force.</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                The feed was checked successfully. Continue to monitor the dedicated alerts page.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data.alerts.slice(0, 5).map((alert) => (
                <li key={alert.id} className="p-4 sm:px-5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-danger">
                      {alert.severity}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {alert.authority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-snug text-text-light">
                    {alert.headline}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-border p-4 sm:px-5">
            <Link
              href="/alerts"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
            >
              Open all alerts
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      {highestNeed !== undefined ? (
        <p className="sr-only">
          {highestNeed.name} currently appears first in the evidence queue with{' '}
          {highestNeed.bottomHalf} lower-half signals.
        </p>
      ) : null}
    </div>
  );
}
