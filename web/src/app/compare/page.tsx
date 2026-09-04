import React from 'react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export default function ComparePage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="font-display text-3xl font-bold">District Comparison</h1>
        <p className="text-text-light/60 mt-2">Side-by-side comparison of two districts — coming soon</p>
      </div>
    </DashboardLayout>
  );
}
