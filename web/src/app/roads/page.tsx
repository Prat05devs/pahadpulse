import React from 'react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export default function RoadsPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="font-display text-3xl font-bold">Roads, Traffic & Navigation</h1>
        <p className="text-text-light/60 mt-2">Road closure and congestion data — coming soon</p>
      </div>
    </DashboardLayout>
  );
}
