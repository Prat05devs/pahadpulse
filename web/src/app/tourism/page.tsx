import React from 'react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export default function TourismPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="font-display text-3xl font-bold">Live Tourism</h1>
        <p className="text-text-light/60 mt-2">Char Dham pilgrimage monitoring + tourist flow — coming soon</p>
      </div>
    </DashboardLayout>
  );
}
