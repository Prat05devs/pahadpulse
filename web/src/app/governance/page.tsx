import React from 'react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export default function GovernancePage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="font-display text-3xl font-bold">Governance Dashboard</h1>
        <p className="text-text-light/60 mt-2">Authenticated official situation room — coming soon</p>
      </div>
    </DashboardLayout>
  );
}
