import React from 'react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export default function MigrationPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="font-display text-3xl font-bold">Palayan / Migration Tracker</h1>
        <p className="text-text-light/60 mt-2">Rural-to-urban migration and empty villages — coming soon</p>
      </div>
    </DashboardLayout>
  );
}
