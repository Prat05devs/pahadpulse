'use client';

import React from 'react';
import type { LiveCounters } from '../types';

interface LiveCountersProps {
  data: LiveCounters;
  loading?: boolean;
}

export function LiveCounters({ data, loading }: LiveCountersProps) {
  const counters = [
    {
      label: 'Tourists in State',
      value: data.touristsInState.toLocaleString('en-IN'),
      unit: 'people',
      color: 'bg-blue-100 text-blue-700',
    },
    {
      label: 'Active Alerts',
      value: data.activeAlerts,
      unit: 'now',
      color: 'bg-red-100 text-red-700',
    },
    {
      label: 'Closed Roads',
      value: data.closedRoads,
      unit: 'segments',
      color: 'bg-orange-100 text-orange-700',
    },
    {
      label: 'Connectivity',
      value: `${data.connectivityPercentage}%`,
      unit: 'online',
      color: 'bg-green-100 text-green-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
      {counters.map((counter) => (
        <div
          key={counter.label}
          className={`${counter.color} p-6 rounded-lg shadow-sm border border-current border-opacity-20`}
        >
          {loading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-8 bg-current opacity-20 rounded w-3/4" />
              <div className="h-4 bg-current opacity-20 rounded w-1/2" />
            </div>
          ) : (
            <>
              <p className="text-sm font-medium opacity-75">{counter.label}</p>
              <p className="text-3xl font-bold mt-2">{counter.value}</p>
              <p className="text-xs opacity-60 mt-1">{counter.unit}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
