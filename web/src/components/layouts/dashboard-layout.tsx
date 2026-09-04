'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: '🏠' },
  { label: 'Live Alerts', href: '/alerts', icon: '🚨' },
  { label: 'District Dashboard', href: '/districts', icon: '📍' },
  { label: 'Compare Districts', href: '/compare', icon: '⚖️' },
  { label: 'Traffic & Roads', href: '/roads', icon: '🛣️' },
  { label: 'Weather & Rivers', href: '/hydromet', icon: '🌧️' },
  { label: 'Tourism Live', href: '/tourism', icon: '🏛️' },
  { label: 'Migration Tracker', href: '/migration', icon: '👥' },
  { label: 'Speed & Connectivity', href: '/connectivity', icon: '📡' },
  { label: 'Sector Intelligence', href: '/intelligence', icon: '📊' },
  { label: 'Governance Dashboard', href: '/governance', icon: '🏛️' },
  { label: 'Offline Mode', href: '/offline', icon: '📱' },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-bg-light">
      {/* Left Rail Navigation */}
      <aside className="w-rail bg-bg-dark text-text-dark flex flex-col border-r border-border overflow-y-auto">
        {/* Logo / Header */}
        <div className="px-4 py-6 border-b border-border/20">
          <h1 className="font-display text-lg font-bold">Pahad Pulse</h1>
          <p className="text-xs text-text-dark/70 mt-1">Uttarakhand Intel</p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  'border-l-4 border-transparent',
                  isActive
                    ? 'border-l-accent bg-bg-dark/50 text-accent'
                    : 'text-text-dark hover:bg-bg-dark/50 border-l-bg-dark'
                )}
              >
                <span className="text-base">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="bg-accent text-bg-dark text-xs font-bold px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-border/20 text-xs text-text-dark/60">
          <p>© Pahad Pulse</p>
          <p className="mt-1">Data for All</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-bg-light">
        {children}
      </main>
    </div>
  );
}
