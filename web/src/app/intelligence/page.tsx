import React from 'react';
import type { Metadata } from 'next';
import {
  Briefcase,
  Database,
  Factory,
  GraduationCap,
  HeartPulse,
  RadioTower,
  Search,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export const metadata: Metadata = {
  title: 'Sector Intelligence — Pahad Pulse',
  description:
    'Analytics and insights across demographics, health, education, economy, and industry.',
};

export default function IntelligencePage() {
  const sectors: { title: string; icon: LucideIcon; metrics: string[] }[] = [
    {
      title: 'Demographics',
      icon: Users,
      metrics: ['Population', 'Age distribution', 'Migration patterns'],
    },
    {
      title: 'Health',
      icon: HeartPulse,
      metrics: ['Healthcare facilities', 'Disease prevalence', 'Infant mortality rate'],
    },
    {
      title: 'Education',
      icon: GraduationCap,
      metrics: ['Literacy rate', 'School enrollment', 'Primary attendance'],
    },
    {
      title: 'Economy',
      icon: Briefcase,
      metrics: ['Per capita income', 'Employment rate', 'Poverty level'],
    },
    {
      title: 'Industry',
      icon: Factory,
      metrics: ['Agricultural output', 'Tourism revenue', 'Manufacturing'],
    },
    {
      title: 'Connectivity',
      icon: RadioTower,
      metrics: ['Mobile coverage', 'Internet speed', 'Broadband access'],
    },
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        {/* Header */}
        <div className="bg-bg-dark px-4 py-6 text-text-dark sm:px-6 md:py-8">
          <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">Sector Intelligence</h1>
          <p className="text-text-dark/70 mt-2">
            Consolidated analytics across six development sectors
          </p>
        </div>

        {/* Content */}
        <div className="space-y-5 px-4 py-5 sm:px-6 md:py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectors.map((sector) => {
              const Icon = sector.icon;

              return (
                <div
                  key={sector.title}
                  className="bg-surface border border-border rounded-lg p-6 hover:shadow-md transition"
                >
                  <span className="mb-4 flex size-10 items-center justify-center rounded-lg bg-info-soft text-info">
                    <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <h2 className="font-bold text-lg mb-3">{sector.title}</h2>
                  <ul className="text-sm text-text-light/70 space-y-1">
                    {sector.metrics.map((metric) => (
                      <li key={metric}>• {metric}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="mb-2 flex items-center gap-2 font-bold text-blue-900">
              <Database className="size-5" strokeWidth={1.8} aria-hidden="true" />
              Data Sources
            </h2>
            <p className="text-blue-800 text-sm">
              All statistics are sourced from official government departments and agencies. Data is
              verified, attributed, and time-stamped. View individual district pages for specific
              sector indicators.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h2 className="mb-2 flex items-center gap-2 font-bold text-amber-900">
              <Search className="size-5" strokeWidth={1.8} aria-hidden="true" />
              How to Use
            </h2>
            <p className="text-amber-800 text-sm">
              Visit any district detail page to see indicators for that area. Use the comparison
              tool to benchmark multiple districts. Indicators show vintage dates and data freshness
              status.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
