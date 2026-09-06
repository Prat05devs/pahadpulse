import React from 'react';
import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { fetchCharDhamLoad } from '@/features/tourism/services';

export const metadata: Metadata = {
  title: 'Tourism & Pilgrim Load — Pahad Pulse',
  description: 'Real-time visitor tracking for Char Dham and tourist destinations in Uttarakhand.',
};

export const dynamic = 'force-dynamic';

export default async function TourismPage() {
  let destinations = null;
  let error = null;

  try {
    destinations = await fetchCharDhamLoad();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load data';
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        {/* Header */}
        <div className="bg-bg-dark px-4 py-6 text-text-dark sm:px-6 md:py-8">
          <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">Tourism & Pilgrim Load</h1>
          <p className="text-text-dark/70 mt-2">
            Real-time visitor tracking for Char Dham and tourist destinations
          </p>
        </div>

        {/* Content */}
        <div className="space-y-5 px-4 py-5 sm:px-6 md:py-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-semibold">Unable to load data</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Char Dham */}
          {destinations && destinations.length > 0 && (
            <div className="bg-surface border border-border rounded-lg p-6">
              <h2 className="font-display text-2xl font-bold mb-4">🏛️ Char Dham Sites</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {destinations.map((dest) => {
                  const loadColor =
                    dest.loadState === 'at_capacity'
                      ? 'bg-red-50 border-red-200'
                      : dest.loadState === 'high'
                        ? 'bg-orange-50 border-orange-200'
                        : dest.loadState === 'moderate'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-green-50 border-green-200';

                  return (
                    <div key={dest.id} className={`border rounded-lg p-4 ${loadColor}`}>
                      <p className="font-bold mb-2">{dest.name.en}</p>
                      <p className="text-xs text-text-light/60 mb-3">{dest.name.hi}</p>

                      <div className="space-y-2 text-sm">
                        {dest.latestCount && (
                          <>
                            <div className="flex justify-between">
                              <span>Current Visitors</span>
                              <span className="font-semibold">
                                {dest.latestCount.count.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Capacity</span>
                              <span className="font-semibold">
                                {dest.dailyCapacity.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Load</span>
                              <span className="font-semibold">
                                {((dest.latestCount.count / dest.dailyCapacity) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </>
                        )}

                        <div className="bg-white/50 px-2 py-1 rounded text-xs">
                          {dest.loadState.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!destinations || destinations.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-semibold text-text-dark">Loading tourism data...</p>
            </div>
          ) : null}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-blue-900 mb-2">Peak Season</h3>
            <p className="text-blue-800 text-sm">
              The Char Dham yatra (pilgrimage) typically sees peak loads during: May-June (summer),
              August-September (monsoon), October-November (autumn)
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
