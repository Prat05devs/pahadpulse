import React from 'react';
import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { fetchRiverLevels } from '@/features/weather/services';

export const metadata: Metadata = {
  title: 'Weather & Rivers — Pahad Pulse',
  description: 'Real-time weather observations and river level monitoring across Uttarakhand.',
};

export const revalidate = 300;

export default async function WeatherPage() {
  let rivers = null;
  let error = null;

  try {
    rivers = await fetchRiverLevels();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load data';
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        {/* Header */}
        <div className="bg-bg-dark text-text-dark py-8 px-6">
          <h1 className="font-display text-4xl font-bold">Weather & Rivers</h1>
          <p className="text-text-dark/70 mt-2">
            Real-time weather and river monitoring across Uttarakhand
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-semibold">Unable to load data</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* River Levels */}
          {rivers && rivers.length > 0 && (
            <div className="bg-surface border border-border rounded-lg p-6">
              <h2 className="font-display text-2xl font-bold mb-4">River Levels 🌊</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rivers.map((river: any) => (
                  <div
                    key={river.station.id}
                    className="border border-border rounded-lg p-4 hover:bg-surface-hover transition"
                  >
                    <p className="font-bold mb-2">{river.station.name.en}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Level</span>
                        <span className="font-semibold">
                          {river.latestLevel.value} {river.latestLevel.unit}
                        </span>
                      </div>
                      {river.latestLevel.delta !== null && (
                        <div className="flex justify-between">
                          <span>Change</span>
                          <span className={river.latestLevel.delta > 0 ? 'text-red-600' : 'text-green-600'}>
                            {river.latestLevel.delta > 0 ? '+' : ''}{river.latestLevel.delta.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {river.threshold && (
                        <div className="flex justify-between">
                          <span>Danger Level</span>
                          <span className="font-semibold">{river.threshold.value}</span>
                        </div>
                      )}
                      <p className="text-xs text-text-light/50 pt-2 border-t">
                        Updated: {new Date(river.latestLevel.observedAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!rivers || rivers.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-semibold text-text-dark">Loading river data...</p>
            </div>
          ) : null}

          {/* Weather Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="font-display text-2xl font-bold text-blue-900 mb-4">
              Weather Stations 🌤️
            </h2>
            <p className="text-blue-800">
              Weather data for individual districts is available on their detail pages.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
