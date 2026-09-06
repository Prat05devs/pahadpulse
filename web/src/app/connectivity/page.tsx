import React from 'react';
import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export const metadata: Metadata = {
  title: 'Internet Connectivity — Pahad Pulse',
  description: 'Real-time monitoring of internet speed and broadband coverage across Uttarakhand.',
};

export default function ConnectivityPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        <div className="bg-bg-dark px-4 py-6 text-text-dark sm:px-6 md:py-8">
          <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">Internet Connectivity</h1>
          <p className="text-text-dark/70 mt-2">Broadband coverage and speed monitoring across districts</p>
        </div>

        <div className="space-y-5 px-4 py-5 sm:px-6 md:py-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="font-bold text-blue-900 mb-2">📡 Connectivity Status</h2>
            <p className="text-blue-800 text-sm">
              Real-time broadband coverage, 4G/5G availability, and internet speed metrics by district.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-bold mb-2">Mobile Coverage</h3>
              <p className="text-sm text-text-light/60">4G and 5G availability by network</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-bold mb-2">Fixed Broadband</h3>
              <p className="text-sm text-text-light/60">Fiber and wireless broadband penetration</p>
            </div>
          </div>

          <div className="text-center py-8 text-text-light/60">
            <p>View connectivity metrics by district on their detail pages</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
