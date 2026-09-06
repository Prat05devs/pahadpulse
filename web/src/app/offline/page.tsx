import React from 'react';
import type { Metadata } from 'next';
import { Clock3, Download, HardDrive, Lightbulb, RefreshCw, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export const metadata: Metadata = {
  title: 'Offline Mode — Pahad Pulse',
  description: 'Download district data for offline access in low-connectivity areas.',
};

export default function OfflinePage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        <div className="bg-bg-dark px-4 py-6 text-text-dark sm:px-6 md:py-8">
          <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">Offline Mode</h1>
          <p className="text-text-dark/70 mt-2">
            Download data for access in low-connectivity areas
          </p>
        </div>

        <div className="space-y-5 px-4 py-5 sm:px-6 md:py-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="mb-2 flex items-center gap-2 font-bold text-yellow-900">
              <RefreshCw className="size-5" strokeWidth={1.8} aria-hidden="true" />
              Sync Strategy
            </h2>
            <p className="text-yellow-800 text-sm">
              Download latest district data to your device for offline access. Data syncs
              automatically when connectivity returns. Currently planned for v2 with service worker
              support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="mb-2 flex items-center gap-2 font-bold">
                <Download className="size-5 text-info" strokeWidth={1.8} aria-hidden="true" />
                Download Data
              </h3>
              <p className="text-sm text-text-light/60">Select districts to cache locally</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="mb-2 flex items-center gap-2 font-bold">
                <Clock3 className="size-5 text-info" strokeWidth={1.8} aria-hidden="true" />
                Last Sync
              </h3>
              <p className="text-sm text-text-light/60">View when data was last updated</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="mb-2 flex items-center gap-2 font-bold">
                <HardDrive className="size-5 text-info" strokeWidth={1.8} aria-hidden="true" />
                Storage Used
              </h3>
              <p className="text-sm text-text-light/60">Monitor local storage footprint</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="mb-2 flex items-center gap-2 font-bold">
                <Trash2 className="size-5 text-danger" strokeWidth={1.8} aria-hidden="true" />
                Manage Cache
              </h3>
              <p className="text-sm text-text-light/60">Delete old or unwanted data</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="mb-2 flex items-center gap-2 font-bold text-blue-900">
              <Lightbulb className="size-5" strokeWidth={1.8} aria-hidden="true" />
              Use Cases
            </h2>
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
