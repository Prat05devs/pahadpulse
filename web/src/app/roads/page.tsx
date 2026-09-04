import React from 'react';
import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export const metadata: Metadata = {
  title: 'Roads & Traffic — Pahad Pulse',
  description: 'Real-time road closures, traffic status, and highway conditions in Uttarakhand.',
};

export const revalidate = 600;

export default async function RoadsPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        {/* Header */}
        <div className="bg-bg-dark text-text-dark py-8 px-6">
          <h1 className="font-display text-4xl font-bold">Roads & Traffic</h1>
          <p className="text-text-dark/70 mt-2">
            Highway closures, traffic status, and navigation conditions
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="font-bold text-yellow-900 mb-2">🛣️ Road Status</h2>
            <p className="text-yellow-800">
              Integrating live road closure data from PWD and NHAI. View road status by district.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="font-bold text-blue-900 mb-2">📡 Live Traffic</h2>
            <p className="text-blue-800">
              Live traffic data via Google Maps is rendered client-side and updated in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-bold mb-2">National Highways (NH)</h3>
              <p className="text-sm text-text-light/60">Major routes through Uttarakhand</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-bold mb-2">State Highways (SH)</h3>
              <p className="text-sm text-text-light/60">Regional connectivity</p>
            </div>
          </div>

          <div className="text-center py-8 text-text-light/60">
            <p>Road closures for your district appear on its detail page</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
