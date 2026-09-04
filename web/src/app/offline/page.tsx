import React from 'react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export default function OfflinePage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="font-display text-3xl font-bold">Offline Mode</h1>
        <p className="text-text-light/60 mt-2">Download and sync mechanism for low-connectivity areas — coming soon</p>
      </div>
    </DashboardLayout>
  );
}
