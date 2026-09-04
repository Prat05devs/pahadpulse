import React from 'react';
import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export const metadata: Metadata = {
  title: 'Sector Intelligence — Pahad Pulse',
  description: 'Analytics and insights across demographics, health, education, economy, and industry.',
};

export default function IntelligencePage() {
  const sectors = [
    {
      title: 'Demographics',
      icon: '👥',
      metrics: ['Population', 'Age distribution', 'Migration patterns'],
    },
    {
      title: 'Health',
      icon: '🏥',
      metrics: ['Healthcare facilities', 'Disease prevalence', 'Infant mortality rate'],
    },
    {
      title: 'Education',
      icon: '📚',
      metrics: ['Literacy rate', 'School enrollment', 'Primary attendance'],
    },
    {
      title: 'Economy',
      icon: '💼',
      metrics: ['Per capita income', 'Employment rate', 'Poverty level'],
    },
    {
      title: 'Industry',
      icon: '🏭',
      metrics: ['Agricultural output', 'Tourism revenue', 'Manufacturing'],
    },
    {
      title: 'Connectivity',
      icon: '📡',
      metrics: ['Mobile coverage', 'Internet speed', 'Broadband access'],
    },
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        {/* Header */}
        <div className="bg-bg-dark text-text-dark py-8 px-6">
          <h1 className="font-display text-4xl font-bold">Sector Intelligence</h1>
          <p className="text-text-dark/70 mt-2">
            Consolidated analytics across six development sectors
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectors.map((sector) => (
              <div
                key={sector.title}
                className="bg-surface border border-border rounded-lg p-6 hover:shadow-md transition"
              >
                <div className="text-4xl mb-3">{sector.icon}</div>
                <h2 className="font-bold text-lg mb-3">{sector.title}</h2>
                <ul className="text-sm text-text-light/70 space-y-1">
                  {sector.metrics.map((metric) => (
                    <li key={metric}>• {metric}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="font-bold text-blue-900 mb-2">📊 Data Sources</h2>
            <p className="text-blue-800 text-sm">
              All statistics are sourced from official government departments and agencies.
              Data is verified, attributed, and time-stamped. View individual district pages for
              specific sector indicators.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h2 className="font-bold text-amber-900 mb-2">🔍 How to Use</h2>
            <p className="text-amber-800 text-sm">
              Visit any district detail page to see indicators for that area. Use the
              comparison tool to benchmark multiple districts. Indicators show vintage dates
              and data freshness status.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
