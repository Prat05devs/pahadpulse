import React from 'react';
import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { apiClient } from '@/lib/api';
import { z } from 'zod';

export const metadata: Metadata = {
  title: 'Compare Districts — Pahad Pulse',
  description: 'Side-by-side comparison of two districts across key indicators.',
};

const DistrictListSchema = z.array(z.any());

export default async function ComparePage() {
  let districts = null;
  let error = null;

  try {
    districts = await apiClient.get('/areas/districts', DistrictListSchema);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load districts';
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        {/* Header */}
        <div className="bg-bg-dark text-text-dark py-8 px-6">
          <h1 className="font-display text-4xl font-bold">Compare Districts</h1>
          <p className="text-text-dark/70 mt-2">
            Select two districts to compare key indicators and statistics
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              <p className="font-semibold">Unable to load districts</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="font-bold text-blue-900 mb-2">How to Compare</h2>
            <ol className="text-blue-800 text-sm space-y-1">
              <li>1. Visit any district detail page (e.g., /districts/almora)</li>
              <li>2. Find the comparison link at the top</li>
              <li>3. Select a second district to compare</li>
              <li>4. View indicators side-by-side with demographics, health, education, and economy</li>
            </ol>
          </div>

          {districts && districts.length > 0 && (
            <div>
              <h2 className="font-bold text-lg mb-4">Select First District</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {districts.map((district: any) => (
                  <a
                    key={district.id}
                    href={`/districts/${district.slug}`}
                    className="bg-surface border border-border rounded-lg p-4 hover:border-accent hover:shadow-md transition-all"
                  >
                    <h3 className="font-bold hover:text-accent">
                      {district.name.en}
                    </h3>
                    <p className="text-sm text-text-light/60">{district.name.hi}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
