import React from 'react';
import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export const metadata: Metadata = {
  title: 'District Dashboard — Pahad Pulse',
};

export default function DistrictsPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="font-display text-3xl font-bold">District Dashboard</h1>
        <p className="text-text-light/60 mt-2">Full detail page for any selected district — coming soon</p>
      </div>
    </DashboardLayout>
  );
}
