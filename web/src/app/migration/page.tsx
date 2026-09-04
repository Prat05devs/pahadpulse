import React from 'react';
import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export const metadata: Metadata = {
  title: 'Migration Tracker — Pahad Pulse',
  description: 'Rural-to-urban migration patterns and ghost village tracking in Uttarakhand.',
};

export default function MigrationPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        <div className="bg-bg-dark text-text-dark py-8 px-6">
          <h1 className="font-display text-4xl font-bold">Palayan — Migration Tracker</h1>
          <p className="text-text-dark/70 mt-2">Understanding rural-to-urban migration in hill villages</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h2 className="font-bold text-amber-900 mb-2">📊 Deferred Feature</h2>
            <p className="text-amber-800 text-sm">
              The Migration module is planned for v2 and will track Palayan (out-migration) patterns
              across Uttarakhand's hill villages. This includes ghost villages, seasonal migration,
              and demographic trends.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-bold mb-2">👥 Household Data</h3>
              <p className="text-sm text-text-light/60">Migration from villages to cities</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-bold mb-2">🏚️ Ghost Villages</h3>
              <p className="text-sm text-text-light/60">Abandoned and low-population villages</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-bold mb-2">📈 Trends</h3>
              <p className="text-sm text-text-light/60">Multi-year migration patterns</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-bold mb-2">🎯 Remittances</h3>
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
