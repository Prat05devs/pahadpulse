import React from 'react';
import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import {
  LiveCounters,
  StateOverviewCard,
  QuickAccessGrid,
  DistrictOverviewGrid,
} from '@/features/dashboard/components';
import {
  fetchLiveCounters,
  fetchStateOverview,
  fetchAllDistricts,
} from '@/features/dashboard/services';

export const metadata: Metadata = {
  title: 'Home Dashboard — Pahad Pulse',
  description: 'Live state-level overview of Uttarakhand with interactive map and key metrics.',
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let counters = null;
  let overview = null;
  let districts = null;
  let error = null;

  try {
    const [c, o, d] = await Promise.all([
      fetchLiveCounters(),
      fetchStateOverview(),
      fetchAllDistricts(),
    ]);
    counters = c;
    overview = o;
    districts = d;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load dashboard data';
    console.error('Dashboard data fetch error:', err);
  }

  if (error || !counters || !overview || !districts) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-bg-light">
          <div className="bg-bg-dark text-text-dark py-8 px-6">
            <h1 className="font-display text-4xl font-bold">Uttarakhand Home Dashboard</h1>
            <p className="text-text-dark/70 mt-2">
              Live state-level overview with interactive map and key metrics
            </p>
          </div>

          <div className="p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-semibold">Unable to load dashboard</p>
              <p className="text-sm mt-1">
                {error || 'Please ensure the API server is running at http://localhost:3000/api'}
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        {/* Header */}
        <div className="bg-bg-dark text-text-dark py-8 px-6">
          <h1 className="font-display text-4xl font-bold">Uttarakhand Home Dashboard</h1>
          <p className="text-text-dark/70 mt-2">
            Live state-level overview with interactive map and key metrics
          </p>
        </div>

        {/* Live Counters */}
        <LiveCounters data={counters} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* State Overview - larger on left */}
          <div className="lg:col-span-2">
            <StateOverviewCard data={overview} />
          </div>

          {/* Placeholder for interactive map */}
          <div className="bg-surface border border-border rounded-lg p-6 shadow-sm flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4">🗺️</div>
              <h3 className="font-bold mb-2">Uttarakhand Map</h3>
              <p className="text-xs text-text-light/60">
                Interactive district map with data layers coming soon
              </p>
            </div>
          </div>
        </div>

        {/* Quick Access Grid */}
        <QuickAccessGrid />

        {/* All Districts Overview */}
        <DistrictOverviewGrid districts={districts} />

        {/* Footer */}
        <div className="bg-bg-light border-t border-border p-6 text-center text-sm text-text-light/60">
          <p>
            Data from government sources — see each figure's attribution on district pages
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
