'use client';

import React from 'react';
import Link from 'next/link';
import type { DistrictSummary } from '../types';

interface DistrictOverviewGridProps {
  districts: DistrictSummary[];
  loading?: boolean;
}

export function DistrictOverviewGrid({ districts, loading }: DistrictOverviewGridProps) {
  return (
    <div className="p-6">
      <h2 className="font-display text-2xl font-bold mb-6">All 13 Districts</h2>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 13 }).map((_, i) => (
            <div key={i} className="bg-surface-hover h-32 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {districts.map((district) => (
            <Link
              key={district.id}
              href={`/districts/${district.slug}`}
              className="group bg-surface border border-border rounded-lg p-4 hover:border-accent hover:shadow-md transition-all hover:bg-surface-hover"
            >
              <h3 className="font-bold text-sm group-hover:text-accent transition-colors">
                {district.name}
              </h3>
              <p className="text-xs text-text-light/60 mb-3">{district.nameHi}</p>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Population</span>
                  <span className="font-semibold">
                    {(district.population / 100000).toFixed(1)}L
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Active Alerts</span>
                  <span className={`font-semibold ${district.activeAlerts > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {district.activeAlerts}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
