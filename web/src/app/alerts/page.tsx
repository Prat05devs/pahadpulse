import React from 'react';
import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { AlertCard } from '@/features/alerts/components';
import { fetchActiveAlerts } from '@/features/alerts/services';

export const metadata: Metadata = {
  title: 'Live Alerts — Pahad Pulse',
  description: 'Active weather, disaster, road, and river alerts across Uttarakhand.',
};

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  let alerts = null;
  let error = null;

  try {
    alerts = await fetchActiveAlerts(undefined, 50);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load alerts';
    console.error('Alerts fetch error:', err);
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        {/* Header */}
        <div className="bg-bg-dark text-text-dark py-8 px-6">
          <h1 className="font-display text-4xl font-bold">Live Alerts</h1>
          <p className="text-text-dark/70 mt-2">
            Weather, disaster, road & river alerts across Uttarakhand
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              <p className="font-semibold">Unable to load alerts</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {!alerts || alerts.data.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">✨</p>
              <p className="font-semibold text-text-dark mb-1">No active alerts</p>
              <p className="text-text-light/60">All systems normal across Uttarakhand</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-light/70">
                Showing {alerts.data.length} active alert{alerts.data.length !== 1 ? 's' : ''}
              </p>

              <div className="space-y-3">
                {alerts.data.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>

              {alerts.pagination.hasMore && (
                <div className="text-center pt-4">
                  <button className="bg-accent text-bg-dark px-6 py-2 rounded font-semibold hover:opacity-90 transition-opacity">
                    Load More
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
