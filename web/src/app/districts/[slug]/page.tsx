import React from 'react';
import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { apiClient } from '@/lib/api';
import { z } from 'zod';

interface DistrictDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(
  { params }: DistrictDetailPageProps
): Promise<Metadata> {
  try {
    const { slug } = await params;
    const district = await apiClient.get(
      `/areas/districts/${slug}`,
      z.any()
    );
    return {
      title: `${district.district.name.en} — Pahad Pulse`,
      description: `Dashboard for ${district.district.name.en} district with weather, alerts, and statistics.`,
    };
  } catch {
    return {
      title: 'District Dashboard — Pahad Pulse',
    };
  }
}

export const dynamic = 'force-dynamic';

export default async function DistrictDetailPage({
  params,
}: DistrictDetailPageProps) {
  const { slug } = await params;
  let district = null;
  let alerts = null;
  let indicators = null;
  let weather = null;
  let error = null;

  try {
    const [districtData, alertsData, indicatorsData, weatherData] =
      await Promise.all([
        apiClient.get(`/areas/districts/${slug}`, z.any()),
        apiClient.get(`/areas/${slug}/alerts`, z.any()).catch(() => null),
        apiClient.get(`/areas/${slug}/indicators`, z.any()).catch(() => null),
        apiClient.get(`/areas/${slug}/weather`, z.any()).catch(() => null),
      ]);

    district = districtData;
    alerts = alertsData;
    indicators = indicatorsData;
    weather = weatherData;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load district data';
  }

  if (error || !district) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-bg-light p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p className="font-semibold">Unable to load district</p>
            <p className="text-sm mt-1">
              {error || 'District not found'}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const districtData = district.district;
  const tehsils = district.tehsils || [];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-bg-light">
        {/* Header */}
        <div className="bg-bg-dark text-text-dark py-8 px-6">
          <h1 className="font-display text-4xl font-bold">
            {districtData.name.en}
          </h1>
          <p className="text-text-dark/70 mt-2">{districtData.name.hi}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Active Alerts */}
          {alerts?.data && alerts.data.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h2 className="font-bold text-red-800 mb-2">
                🚨 {alerts.data.length} Active Alert{alerts.data.length !== 1 ? 's' : ''}
              </h2>
              <ul className="space-y-2">
                {alerts.data.slice(0, 3).map((alert: any) => (
                  <li key={alert.id} className="text-sm text-red-700">
                    • {alert.headline}
                  </li>
                ))}
              </ul>
              {alerts.data.length > 3 && (
                <p className="text-sm text-red-700 mt-2">
                  +{alerts.data.length - 3} more
                </p>
              )}
            </div>
          )}

          {/* Weather Data */}
          {weather && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface border border-border rounded-lg p-4">
                <p className="text-sm text-text-light/60 mb-1">🌡️ Temperature</p>
                <p className="text-2xl font-bold">
                  {weather.temperature?.value || '—'}°C
                </p>
              </div>
              <div className="bg-surface border border-border rounded-lg p-4">
                <p className="text-sm text-text-light/60 mb-1">💧 Rainfall</p>
                <p className="text-2xl font-bold">
                  {weather.rainfall?.value || '—'} mm
                </p>
              </div>
              <div className="bg-surface border border-border rounded-lg p-4">
                <p className="text-sm text-text-light/60 mb-1">💨 Humidity</p>
                <p className="text-2xl font-bold">
                  {weather.humidity?.value || '—'}%
                </p>
              </div>
            </div>
          )}

          {/* Indicators / Statistics */}
          {indicators?.length && indicators.length > 0 && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <h2 className="font-bold text-lg mb-4">Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {indicators.slice(0, 6).map((ind: any) => (
                  <div key={ind.indicatorKey} className="border-b pb-3">
                    <p className="text-sm text-text-light/60">
                      {ind.label?.en || ind.indicatorKey}
                    </p>
                    <p className="text-xl font-bold">
                      {ind.value} {ind.unit || ''}
                    </p>
                    {ind.vintage && (
                      <p className="text-xs text-text-light/40 mt-1">
                        Vintage: {ind.vintage}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tehsils */}
          {tehsils.length > 0 && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <h2 className="font-bold text-lg mb-4">
                Tehsils ({tehsils.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {tehsils.map((tehsil: any) => (
                  <div
                    key={tehsil.id}
                    className="border border-border rounded p-3 hover:bg-surface-hover transition"
                  >
                    <p className="font-semibold">{tehsil.name.en}</p>
                    <p className="text-sm text-text-light/60">{tehsil.name.hi}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* District Info */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h2 className="font-bold text-lg mb-4">District Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-light/60">Area Code</p>
                <p className="font-semibold">{districtData.code}</p>
              </div>
              {districtData.centroid && (
                <>
                  <div>
                    <p className="text-sm text-text-light/60">Latitude</p>
                    <p className="font-semibold">{districtData.centroid.lat.toFixed(4)}°</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-light/60">Longitude</p>
                    <p className="font-semibold">{districtData.centroid.lng.toFixed(4)}°</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
