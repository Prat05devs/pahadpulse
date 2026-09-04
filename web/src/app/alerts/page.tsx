import React from 'react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export default function AlertsPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light p-6">
        <h1 className="font-display text-3xl font-bold mb-4">Live Alerts</h1>
        <p className="text-text-light/70">Weather, disaster & road alerts coming soon...</p>
      </div>
    </DashboardLayout>
  );
}
