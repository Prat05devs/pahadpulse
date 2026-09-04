'use client';

import React from 'react';
import type { StateOverview } from '../types';

interface StateOverviewCardProps {
  data: StateOverview;
  loading?: boolean;
}

export function StateOverviewCard({ data, loading }: StateOverviewCardProps) {
  const items = [
    {
      label: 'Population',
      value: (data.population / 1000000).toFixed(1),
      unit: 'M',
      icon: '👥',
    },
    {
      label: 'Area',
      value: data.areaKmSq.toLocaleString('en-IN'),
      unit: 'km²',
      icon: '📍',
    },
    {
      label: 'Literacy Rate',
      value: data.literacy,
      unit: '%',
      icon: '📚',
    },
    {
      label: 'Districts',
      value: data.districts,
      unit: '',
      icon: '🗺️',
    },
    {
      label: 'Forest Coverage',
      value: data.forestCoverage,
      unit: '%',
      icon: '🌲',
    },
    {
      label: 'Villages',
      value: data.villages.toLocaleString('en-IN'),
      unit: '',
      icon: '🏘️',
    },
  ];

  return (
    <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
      <h2 className="font-display text-2xl font-bold mb-6">Uttarakhand at a Glance</h2>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-surface-hover rounded" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <div className="text-3xl mb-2">{item.icon}</div>
              <p className="text-2xl font-bold text-accent">
                {item.value}
                <span className="text-sm ml-1">{item.unit}</span>
              </p>
              <p className="text-xs text-text-light/60 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
