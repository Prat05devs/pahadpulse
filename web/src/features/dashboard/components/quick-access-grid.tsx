'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  CloudRain,
  GitCompareArrows,
  MapPinned,
  Mountain,
  Route,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';

interface QuickAccessItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  {
    label: 'Live alerts',
    href: '/alerts',
    icon: AlertTriangle,
    description: 'Weather, disaster and road warnings',
  },
  {
    label: 'District details',
    href: '/districts',
    icon: MapPinned,
    description: 'A complete view of every district',
  },
  {
    label: 'Compare districts',
    href: '/compare',
    icon: GitCompareArrows,
    description: 'Benchmark areas side by side',
  },
  {
    label: 'Tourism live',
    href: '/tourism',
    icon: Mountain,
    description: 'Char Dham and visitor load',
  },
  {
    label: 'Weather & rivers',
    href: '/hydromet',
    icon: CloudRain,
    description: 'Rainfall, forecasts and river levels',
  },
  {
    label: 'Business ease',
    href: '/compare#business',
    icon: Briefcase,
    description: 'Find profitable locations for ventures',
  },
  {
    label: 'Roads & traffic',
    href: '/roads',
    icon: Route,
    description: 'Closures and route conditions',
  },
];

export function QuickAccessGrid() {
  return (
    <section aria-labelledby="quick-access-heading">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Explore
        </p>
        <h2 id="quick-access-heading" className="mt-1 text-xl font-semibold tracking-tight">
          Quick access
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {QUICK_ACCESS_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="interactive-card group flex min-h-28 items-start gap-4 rounded-lg border border-transparent p-5"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-accent">
                <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold">
                  {item.label}
                  <ArrowUpRight
                    className="size-3.5 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
