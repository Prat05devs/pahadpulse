import React from 'react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export default function HydrometPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="font-display text-3xl font-bold">Weather & River Levels</h1>
        <p className="text-text-light/60 mt-2">Meteorological and hydrological monitoring — coming soon</p>
      </div>
    </DashboardLayout>
  );
}
