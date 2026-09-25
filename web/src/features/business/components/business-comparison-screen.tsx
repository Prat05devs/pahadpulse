'use client';

import React, { useState } from 'react';
import { useBusinessScenarios, useBusinessComparison } from '../hooks';
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  CircleDashed,
  Database,
  MapPin,
  Wifi,
  Compass,
  TrendingUp,
  Users,
  Shield,
  Trees,
  ArrowUpRight,
  BadgeIndianRupee,
} from 'lucide-react';
import clsx from 'clsx';
import { type BusinessWeights } from '../schemas';

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div
    className={clsx(
      'bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden',
      className
    )}
  >
    {children}
  </div>
);
const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={clsx('p-4 border-b border-slate-200', className)}>{children}</div>
);
const CardTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h3 className={clsx('font-semibold text-slate-900', className)}>{children}</h3>
);
const CardContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={clsx('p-4', className)}>{children}</div>;

const ICON_MAP: Record<keyof BusinessWeights, React.ElementType> = {
  connectivity: Wifi,
  tourism: Compass,
  roads: TrendingUp,
  urbanPopulation: Users,
  agriculture: Trees,
  safety: Shield,
};

const METRIC_LABELS: Record<keyof BusinessWeights, string> = {
  connectivity: 'Digital Connectivity',
  tourism: 'Tourism Demand & Capacity',
  roads: 'District Road Access',
  urbanPopulation: 'Market & Workforce',
  agriculture: 'Dairy Supply Ecosystem',
  safety: 'Long-term Hazard Resilience',
};

const formatFactValue = (value: number, unit: string) => {
  if (unit === 'percent') return `${value.toLocaleString('en-IN')}%`;
  if (unit === 'inr') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  }
  const formatted = value.toLocaleString('en-IN', {
    maximumFractionDigits: unit === 'Mbps' ? 1 : 0,
  });
  return `${formatted} ${unit.replace(/_/g, ' ')}`;
};

// We receive `districts` (the list of all districts) as a prop from the server component
export function BusinessComparisonScreen({
  districts,
}: {
  districts: Array<{ slug: string; name: { en: string } }>;
}) {
  const [districtA, setDistrictA] = useState('');
  const [districtB, setDistrictB] = useState('');
  const [scenarioId, setScenarioId] = useState('');

  const [activeCompare, setActiveCompare] = useState<{
    a: string;
    b: string;
    scenarioId: string;
  } | null>(null);

  const {
    data: scenarios,
    isLoading: scenariosLoading,
    isFetching: scenariosFetching,
    isError: scenariosFailed,
    refetch: refetchScenarios,
  } = useBusinessScenarios();

  // Set default scenario when scenarios load, but do not trigger compare
  React.useEffect(() => {
    if (scenarios && scenarios.length > 0 && !scenarioId) {
      setScenarioId(scenarios[0].id);
    }
  }, [scenarios, scenarioId]);

  const {
    data: report,
    isLoading: reportLoading,
    error: comparisonError,
  } = useBusinessComparison(
    activeCompare?.a || '',
    activeCompare?.b || '',
    activeCompare?.scenarioId || ''
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Configuration Header */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-3">
              <label
                htmlFor="business-scenario"
                className="block text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2"
              >
                1. Select an Investment Scenario
              </label>
              <select
                id="business-scenario"
                className="w-full rounded-md border-border shadow-sm focus:border-accent focus:ring-accent text-lg p-3 border bg-surface"
                value={scenarioId}
                onChange={(e) => {
                  setScenarioId(e.target.value);
                  setActiveCompare(null);
                }}
                disabled={scenariosLoading || scenariosFailed || !scenarios?.length}
                aria-busy={scenariosLoading || scenariosFetching}
                aria-describedby={scenariosFailed ? 'business-scenario-error' : undefined}
              >
                <option value="" disabled>
                  {scenariosLoading
                    ? 'Loading venture models...'
                    : scenariosFailed
                      ? 'Venture models unavailable'
                      : scenarios?.length
                        ? 'Browse our pre-calculated venture models...'
                        : 'No venture models available'}
                </option>
                {scenarios?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
              {scenariosFailed ? (
                <div
                  id="business-scenario-error"
                  role="alert"
                  className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <AlertCircle aria-hidden="true" size={18} className="shrink-0" />
                    Venture models could not be loaded. Check your connection and try again.
                  </span>
                  <button
                    type="button"
                    onClick={() => void refetchScenarios()}
                    disabled={scenariosFetching}
                    className="min-h-11 rounded-md border border-red-300 bg-white px-4 font-semibold text-red-800 shadow-sm hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {scenariosFetching ? 'Retrying...' : 'Retry'}
                  </button>
                </div>
              ) : null}
              {scenarios && scenarioId && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {scenarios.find((s) => s.id === scenarioId)?.description}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                2. Base Location
              </label>
              <select
                className="w-full rounded-md border-border shadow-sm focus:border-accent focus:ring-accent p-2.5 border bg-surface"
                value={districtA}
                onChange={(e) => {
                  setDistrictA(e.target.value);
                  setActiveCompare(null);
                }}
              >
                <option value="" disabled>
                  Select district...
                </option>
                {districts?.map((d) => (
                  <option key={d.slug} value={d.slug} disabled={d.slug === districtB}>
                    {d.name.en}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-muted-foreground font-bold uppercase tracking-widest mt-6">
                vs
              </span>
            </div>
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                3. Target Location
              </label>
              <select
                className="w-full rounded-md border-border shadow-sm focus:border-accent focus:ring-accent p-2.5 border bg-surface"
                value={districtB}
                onChange={(e) => {
                  setDistrictB(e.target.value);
                  setActiveCompare(null);
                }}
              >
                <option value="" disabled>
                  Select district...
                </option>
                {districts?.map((d) => (
                  <option key={d.slug} value={d.slug} disabled={d.slug === districtA}>
                    {d.name.en}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1 md:col-span-3 mt-4">
              <button
                type="button"
                onClick={() => setActiveCompare({ a: districtA, b: districtB, scenarioId })}
                disabled={!districtA || !districtB || !scenarioId}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Compare
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {comparisonError && activeCompare ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-md flex items-center gap-2">
          <AlertCircle size={20} />
          <p>Failed to load comparison data. {comparisonError.message}</p>
        </div>
      ) : null}

      {/* Report Section */}
      {activeCompare && reportLoading ? (
        <div className="h-64 flex items-center justify-center text-slate-400">
          <p>Evaluating scenarios...</p>
        </div>
      ) : activeCompare && report ? (
        <div className="space-y-6">
          {report.evidence ? (
            <Card className="border-sky-200 bg-sky-50/60">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                      <Database aria-hidden="true" size={20} />
                    </span>
                    <div>
                      <h3 className="font-semibold text-slate-900">Evidence coverage</h3>
                      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
                        {report.evidence.note}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-48 rounded-lg border border-sky-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-medium capitalize text-slate-700">
                        {report.evidence.confidence} confidence
                      </span>
                      <span className="font-bold tabular-nums text-sky-800">
                        {report.evidence.coveragePct}%
                      </span>
                    </div>
                    <progress
                      className="mt-2 h-2 w-full accent-sky-700"
                      value={report.evidence.coveragePct}
                      max={100}
                      aria-label={`${report.evidence.coveragePct}% of requested scenario weight has comparable evidence`}
                    />
                  </div>
                </div>
                {report.evidence.missingMetrics.length > 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">Not scored:</span>{' '}
                    {report.evidence.missingMetrics.map((key) => METRIC_LABELS[key]).join(', ')}.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {report.recommendedSchemes && report.recommendedSchemes.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BadgeIndianRupee className="size-5 text-emerald-700" aria-hidden="true" />
                  Support matched to {report.scenario.name}
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Programme relevance is based on sector and support type; eligibility still requires official review.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {report.recommendedSchemes.map((scheme) => (
                  <a
                    key={scheme.slug}
                    href={scheme.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group min-h-24 rounded-lg border border-slate-200 p-4 hover:border-emerald-300 hover:bg-emerald-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-semibold text-slate-900">{scheme.name}</span>
                      <ArrowUpRight className="size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                    </span>
                    <span className="mt-1 block text-xs capitalize text-slate-500">
                      {scheme.status.replace(/-/g, ' ')} · {scheme.access}
                    </span>
                  </a>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Winner Banner */}
          <div
            className={clsx(
              'p-6 rounded-xl border-2 flex items-start gap-4',
              report.winner === 'tie' || report.winner === 'insufficient'
                ? 'bg-slate-50 border-slate-200'
                : 'bg-indigo-50 border-indigo-200'
            )}
          >
            <div className="bg-white p-3 rounded-full shadow-sm">
              <Briefcase className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {report.winner === 'insufficient'
                  ? 'Not enough evidence to recommend a district'
                  : report.winner === 'tie'
                    ? 'Closely matched on available evidence'
                    : `Better-supported fit: ${report.winner === report.districtA.slug ? report.districtA.name : report.districtB.name}`}
              </h2>
              <p className="text-slate-700 leading-relaxed text-lg">{report.verdict}</p>
            </div>
          </div>

          {/* Side by Side Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[report.districtA, report.districtB].map((dist) => {
              const isWinner = report.winner === dist.slug;
              return (
                <Card key={dist.slug} className={clsx(isWinner && 'ring-2 ring-indigo-500')}>
                  <CardHeader className="bg-slate-50 border-b">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <MapPin size={20} className="text-slate-400" />
                        {dist.name}
                      </CardTitle>
                      <div className="text-right">
                        <span className="text-3xl font-bold text-slate-900">{dist.score}</span>
                        <span className="text-sm text-slate-500 ml-1">/ 100 index</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y divide-slate-100">
                      {(Object.keys(report.scenario.weights) as Array<keyof BusinessWeights>).map(
                        (key) => {
                          const weight = report.scenario.weights[key];
                          if (weight === 0) return null; // hide irrelevant metrics
                          const Icon = ICON_MAP[key];
                          const detail = dist.metricDetails?.[key];
                          const isUnavailable = detail?.available === false;
                          return (
                            <li key={key as string} className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex min-w-0 items-start gap-3">
                                  <div className="rounded-md bg-slate-100 p-2">
                                    <Icon size={18} className="text-slate-600" aria-hidden="true" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-slate-900">
                                      {METRIC_LABELS[key]}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      Scenario weight: {weight}/10
                                    </p>
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  {isUnavailable ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                      <CircleDashed size={14} aria-hidden="true" />
                                      Not scored
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 text-lg font-semibold tabular-nums text-slate-900">
                                      {detail?.available ? (
                                        <CheckCircle2
                                          size={15}
                                          className="text-emerald-600"
                                          aria-hidden="true"
                                        />
                                      ) : null}
                                      {Math.round(detail?.score ?? dist.metrics[key])}
                                      <span className="text-xs font-normal text-slate-400">
                                        idx
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              {detail ? (
                                <div className="ml-11 mt-3">
                                  <p className="text-xs leading-relaxed text-slate-500">
                                    {detail.summary}
                                  </p>
                                  {detail.facts.length > 0 ? (
                                    <details className="mt-2 text-xs text-slate-600">
                                      <summary className="min-h-6 cursor-pointer font-semibold text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">
                                        View source figures
                                      </summary>
                                      <ul className="mt-2 space-y-2 border-l-2 border-sky-100 pl-3">
                                        {detail.facts.map((entry) => (
                                          <li key={`${entry.label}-${entry.vintage}`}>
                                            <span className="font-medium text-slate-800">
                                              {entry.label}:{' '}
                                              {formatFactValue(entry.value, entry.unit)}
                                            </span>
                                            <span className="block text-slate-500">
                                              {entry.sourceUrl ? (
                                                <a
                                                  href={entry.sourceUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="underline decoration-slate-300 underline-offset-2 hover:text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                                                >
                                                  {entry.source}
                                                </a>
                                              ) : (
                                                entry.source
                                              )}{' '}
                                              · {entry.vintage}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </details>
                                  ) : null}
                                </div>
                              ) : null}
                            </li>
                          );
                        }
                      )}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
