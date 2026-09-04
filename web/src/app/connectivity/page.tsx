import React from 'react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export default function ConnectivityPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="font-display text-3xl font-bold">Internet Speed & Connectivity</h1>
        <p className="text-text-light/60 mt-2">Connectivity monitoring and speed testing — coming soon</p>
      </div>
    </DashboardLayout>
  );
}
