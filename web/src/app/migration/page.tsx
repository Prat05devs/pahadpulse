import React from 'react';
import type { Metadata } from 'next';
import { Clock3, Home, TrendingUp, Users, Wallet } from 'lucide-react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export const metadata: Metadata = {
  title: 'Migration Tracker — Pahad Pulse',
  description: 'Rural-to-urban migration patterns and ghost village tracking in Uttarakhand.',
};

export default function MigrationPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        <div className="bg-bg-dark px-4 py-6 text-text-dark sm:px-6 md:py-8">
          <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">Palayan — Migration Tracker</h1>
          <p className="text-text-dark/70 mt-2">
            Understanding rural-to-urban migration in hill villages
          </p>
        </div>

        <div className="space-y-5 px-4 py-5 sm:px-6 md:py-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 sm:p-6">
            <h2 className="mb-2 flex items-center gap-2 font-bold text-amber-900">
              <Clock3 className="size-5" strokeWidth={1.8} aria-hidden="true" />
              Deferred Feature
            </h2>
            <p className="text-amber-800 text-sm">
              The Migration module is planned for v2 and will track Palayan (out-migration) patterns
              across Uttarakhand&apos;s hill villages. This includes ghost villages, seasonal
              migration, and demographic trends.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="mb-2 flex items-center gap-2 font-bold">
                <Users className="size-5 text-info" strokeWidth={1.8} aria-hidden="true" />
                Household Data
              </h3>
              <p className="text-sm text-text-light/60">Migration from villages to cities</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="mb-2 flex items-center gap-2 font-bold">
                <Home className="size-5 text-info" strokeWidth={1.8} aria-hidden="true" />
                Ghost Villages
              </h3>
              <p className="text-sm text-text-light/60">Abandoned and low-population villages</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="mb-2 flex items-center gap-2 font-bold">
                <TrendingUp className="size-5 text-info" strokeWidth={1.8} aria-hidden="true" />
                Trends
              </h3>
              <p className="text-sm text-text-light/60">Multi-year migration patterns</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="mb-2 flex items-center gap-2 font-bold">
                <Wallet className="size-5 text-info" strokeWidth={1.8} aria-hidden="true" />
                Remittances
              </h3>
              <p className="text-sm text-text-light/60">Income and economic impact</p>
            </div>
          </div>

          <div className="text-center py-8 text-text-light/60">
            <p>Stay tuned for this feature in future releases</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
