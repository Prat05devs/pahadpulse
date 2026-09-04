import React from 'react';
import type { Metadata } from 'next';
import { z } from 'zod';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { apiClient } from '@/lib/api';
import { DistrictSummarySchema } from '@/features/dashboard/schemas';

export const metadata: Metadata = {
  title: 'Select District — Pahad Pulse',
};

export const dynamic = 'force-dynamic';

export default async function DistrictsListPage() {
  let districts = null;
  let error = null;

  try {
    districts = await apiClient.get('/areas/districts', z.array(DistrictSummarySchema));
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load districts';
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        {/* Header */}
        <div className="bg-bg-dark text-text-dark py-8 px-6">
          <h1 className="font-display text-4xl font-bold">Districts</h1>
          <p className="text-text-dark/70 mt-2">
            Select a district to view detailed information
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

          {!districts || districts.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-semibold text-text-dark">No districts found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {districts.map((district: any) => (
                <a
                  key={district.id}
                  href={`/districts/${district.slug}`}
                  className="bg-surface border border-border rounded-lg p-6 hover:border-accent hover:shadow-md transition-all hover:bg-surface-hover"
                >
                  <h2 className="font-bold text-lg mb-1 hover:text-accent">
                    {district.name.en}
                  </h2>
                  <p className="text-sm text-text-light/60 mb-4">
                    {district.name.hi}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Tehsils</span>
                      <span className="font-semibold">{district.counts?.tehsils || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Villages</span>
                      <span className="font-semibold">{district.counts?.villages || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Map</span>
                      <span>{district.hasBoundary ? '✓' : '—'}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
