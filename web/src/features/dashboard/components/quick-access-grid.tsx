'use client';

import React from 'react';
import Link from 'next/link';

interface QuickAccessItem {
  label: string;
  href: string;
  icon: string;
  description: string;
}

const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  {
    label: 'Live Alerts',
    href: '/alerts',
    icon: '🚨',
    description: 'Weather, disaster & road alerts',
  },
  {
    label: 'District Details',
    href: '/districts',
    icon: '📍',
    description: 'Full dashboard for any district',
  },
  {
    label: 'Compare Districts',
    href: '/compare',
    icon: '⚖️',
    description: 'Side-by-side comparison',
  },
  {
    label: 'Tourism Live',
    href: '/tourism',
    icon: '🏛️',
    description: 'Char Dham & tourist load',
  },
  {
    label: 'Weather & Rivers',
    href: '/hydromet',
    icon: '🌧️',
    description: 'Temperature, rainfall, levels',
  },
  {
    label: 'Roads & Traffic',
    href: '/roads',
    icon: '🛣️',
    description: 'Closures and traffic status',
  },
  {
    label: 'Migration Tracker',
    href: '/migration',
    icon: '👥',
    description: 'Ghost villages & trends',
  },
  {
    label: 'Connectivity Map',
    href: '/connectivity',
    icon: '📡',
    description: 'Internet speed & coverage',
  },
  {
    label: 'Sector Intelligence',
    href: '/intelligence',
    icon: '📊',
    description: 'Health, education, economy',
  },
];

export function QuickAccessGrid() {
  return (
    <div className="p-6">
      <h2 className="font-display text-2xl font-bold mb-6">Quick Access</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {QUICK_ACCESS_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group bg-surface border border-border rounded-lg p-4 hover:border-accent hover:shadow-md transition-all hover:bg-surface-hover"
          >
            <div className="text-4xl mb-3">{item.icon}</div>
            <h3 className="font-bold text-sm group-hover:text-accent transition-colors">{item.label}</h3>
            <p className="text-xs text-text-light/60 mt-1">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
