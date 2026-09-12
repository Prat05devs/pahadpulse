'use client';

import React, { useState } from 'react';
import { useBusinessScenarios, useBusinessComparison } from '../hooks';
import { AlertCircle, Briefcase, MapPin, Wifi, Compass, TrendingUp, Users, Shield, Trees } from 'lucide-react';
import clsx from 'clsx';
import { type BusinessWeights } from '../schemas';

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={clsx("bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden", className)}>
    {children}
  </div>
);
const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={clsx("p-4 border-b border-slate-200", className)}>{children}</div>
);
const CardTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h3 className={clsx("font-semibold text-slate-900", className)}>{children}</h3>
);
const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={clsx("p-4", className)}>{children}</div>
);

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
  tourism: 'Tourism Footfall',
  roads: 'Road Infrastructure',
  urbanPopulation: 'Urban Market Size',
  agriculture: 'Agro/Dairy Output',
  safety: 'Geological Safety',
};

// We receive `districts` (the list of all districts) as a prop from the server component
export function BusinessComparisonScreen({ districts }: { districts: any[] }) {
  const [districtA, setDistrictA] = useState('');
  const [districtB, setDistrictB] = useState('');
  const [scenarioId, setScenarioId] = useState(''); 

  const [activeCompare, setActiveCompare] = useState<{a: string, b: string, scenarioId: string} | null>(null);

  const { data: scenarios, isLoading: scenariosLoading } = useBusinessScenarios();
  
  // Set default scenario when scenarios load, but do not trigger compare
  React.useEffect(() => {
    if (scenarios && scenarios.length > 0 && !scenarioId) {
      setScenarioId(scenarios[0].id);
    }
  }, [scenarios, scenarioId]);

  const { data: report, isLoading: reportLoading, error } = useBusinessComparison(
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
              <label className="block text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                1. Select an Investment Scenario
              </label>
              <select
                className="w-full rounded-md border-border shadow-sm focus:border-accent focus:ring-accent text-lg p-3 border bg-surface"
                value={scenarioId}
                onChange={(e) => { setScenarioId(e.target.value); setActiveCompare(null); }}
                disabled={scenariosLoading}
              >
                <option value="" disabled>Browse our pre-calculated venture models...</option>
                {scenarios?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                ))}
              </select>
              {scenarios && scenarioId && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {scenarios.find(s => s.id === scenarioId)?.description}
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
                onChange={(e) => { setDistrictA(e.target.value); setActiveCompare(null); }}
              >
                <option value="" disabled>Select district...</option>
                {districts?.map((d) => (
                  <option key={d.slug} value={d.slug} disabled={d.slug === districtB}>{d.name.en}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-muted-foreground font-bold uppercase tracking-widest mt-6">vs</span>
            </div>
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                3. Target Location
              </label>
              <select
                className="w-full rounded-md border-border shadow-sm focus:border-accent focus:ring-accent p-2.5 border bg-surface"
                value={districtB}
                onChange={(e) => { setDistrictB(e.target.value); setActiveCompare(null); }}
              >
                <option value="" disabled>Select district...</option>
                {districts?.map((d) => (
                  <option key={d.slug} value={d.slug} disabled={d.slug === districtA}>{d.name.en}</option>
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

      {error && activeCompare ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-md flex items-center gap-2">
          <AlertCircle size={20} />
          <p>Failed to load comparison data. {error.message}</p>
        </div>
      ) : null}

      {/* Report Section */}
      {activeCompare && reportLoading ? (
        <div className="h-64 flex items-center justify-center text-slate-400">
          <p>Evaluating scenarios...</p>
        </div>
      ) : activeCompare && report ? (
        <div className="space-y-6">
          {/* Winner Banner */}
          <div className={clsx(
            "p-6 rounded-xl border-2 flex items-start gap-4",
            report.winner === 'tie' ? "bg-slate-50 border-slate-200" : "bg-indigo-50 border-indigo-200"
          )}>
            <div className="bg-white p-3 rounded-full shadow-sm">
              <Briefcase className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {report.winner === 'tie' 
                  ? 'It’s a tie!' 
                  : `Winner: ${report.winner === report.districtA.slug ? report.districtA.name : report.districtB.name}`}
              </h2>
              <p className="text-slate-700 leading-relaxed text-lg">{report.verdict}</p>
            </div>
          </div>

          {/* Side by Side Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[report.districtA, report.districtB].map((dist) => {
              const isWinner = report.winner === dist.slug;
              return (
                <Card key={dist.slug} className={clsx(isWinner && "ring-2 ring-indigo-500")}>
                  <CardHeader className="bg-slate-50 border-b">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <MapPin size={20} className="text-slate-400" />
                        {dist.name}
                      </CardTitle>
                      <div className="text-right">
                        <span className="text-3xl font-bold text-slate-900">{dist.score}</span>
                        <span className="text-sm text-slate-500 ml-1">/ 100</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y divide-slate-100">
                      {(Object.keys(report.scenario.weights) as Array<keyof BusinessWeights>).map((key) => {
                        const weight = report.scenario.weights[key];
                        if (weight === 0) return null; // hide irrelevant metrics
                        const Icon = ICON_MAP[key];
                        return (
                          <li key={key as string} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-100 rounded-md">
                                <Icon size={18} className="text-slate-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{METRIC_LABELS[key]}</p>
                                <p className="text-xs text-slate-500">Weight: {weight}/10</p>
                              </div>
                            </div>
                            <div className="w-24 text-right">
                              <span className="text-lg font-semibold">{Math.round(dist.metrics[key])}</span>
                              <span className="text-xs text-slate-400 ml-1">idx</span>
                            </div>
                          </li>
                        );
                      })}
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
