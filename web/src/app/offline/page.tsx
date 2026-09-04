import React from 'react';
import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export const metadata: Metadata = {
  title: 'Offline Mode — Pahad Pulse',
  description: 'Download district data for offline access in low-connectivity areas.',
};

export default function OfflinePage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        <div className="bg-bg-dark text-text-dark py-8 px-6">
          <h1 className="font-display text-4xl font-bold">Offline Mode</h1>
          <p className="text-text-dark/70 mt-2">Download data for access in low-connectivity areas</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="font-bold text-yellow-900 mb-2">🔄 Sync Strategy</h2>
            <p className="text-yellow-800 text-sm">
              Download latest district data to your device for offline access. Data syncs
              automatically when connectivity returns. Currently planned for v2 with service worker support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-bold mb-2">📥 Download Data</h3>
              <p className="text-sm text-text-light/60">Select districts to cache locally</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-bold mb-2">⏱️ Last Sync</h3>
              <p className="text-sm text-text-light/60">View when data was last updated</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-bold mb-2">📊 Storage Used</h3>
              <p className="text-sm text-text-light/60">Monitor local storage footprint</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-bold mb-2">🗑️ Manage Cache</h3>
              <p className="text-sm text-text-light/60">Delete old or unwanted data</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="font-bold text-blue-900 mb-2">💡 Use Cases</h2>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Mountain regions with patchy connectivity</li>
              <li>• Remote villages with limited mobile signal</li>
              <li>• Travel through areas without internet</li>
              <li>• Emergency responders in disaster zones</li>
            </ul>
          </div>

          <div className="text-center py-8 text-text-light/60">
            <p>Offline capabilities planned for future release</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
