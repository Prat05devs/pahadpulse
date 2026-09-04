import React from 'react';
import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export const metadata: Metadata = {
  title: 'Governance Dashboard — Pahad Pulse',
  description: 'Authenticated officer dashboard for crisis management and policy coordination.',
};

export default function GovernancePage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        <div className="bg-bg-dark text-text-dark py-8 px-6">
          <h1 className="font-display text-4xl font-bold">Governance Dashboard</h1>
          <p className="text-text-dark/70 mt-2">Authenticated official situation room for state coordination</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="font-bold text-red-900 mb-2">🔐 Authorization Required</h2>
            <p className="text-red-800 text-sm">
              This dashboard is restricted to authorized government officers and requires authentication.
              Access credentials are managed through verified government email addresses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-bold mb-2">🚨 Crisis Management</h3>
              <p className="text-sm text-text-light/60">Real-time alert monitoring and response</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-bold mb-2">📋 Resource Coordination</h3>
              <p className="text-sm text-text-light/60">Inter-agency resource allocation</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-bold mb-2">📊 Analytics</h3>
              <p className="text-sm text-text-light/60">Deep-dive analysis and reporting</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-bold mb-2">👥 Teams</h3>
              <p className="text-sm text-text-light/60">Department and officer management</p>
            </div>
          </div>

          <div className="text-center py-8">
            <p className="text-text-light/60">Governance features are deferred to v2</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
