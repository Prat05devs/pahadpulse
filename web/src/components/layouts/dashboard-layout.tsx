'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu as MenuIconData,
  X as CloseIconData,
} from 'lucide';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CloudRain,
  Gauge,
  GitCompareArrows,
  HardDriveDownload,
  Home,
  Mountain,
  RadioTower,
  Route,
  X,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { MorphIcon } from 'morphicons/react';

/**
 * Morph physics for the navigation icon transitions.
 *
 * The built-in `snappy` preset is stiffness 420 — the fastest of the three — and at that
 * speed the morph is finished before the eye can follow the shape actually changing, which
 * defeats the reason for using a morph over swapping two icons.
 *
 * These values give a damping ratio of about 0.78 (damping / 2√stiffness), so the shape
 * overshoots very slightly and settles in roughly six tenths of a second: slow enough to
 * read the bars becoming the panel mark, quick enough that the control never feels laggy.
 *
 * `reducedMotion: 'user'` still applies at every call site, so a viewer who asks for less
 * motion gets an instant swap regardless of these numbers.
 */
const NAV_MORPH = { stiffness: 70, damping: 13 } as const;

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Home', href: '/', icon: Home },
      { label: 'Live Alerts', href: '/alerts', icon: AlertTriangle },
      { label: 'Districts', href: '/districts', icon: Building2 },
      { label: 'Compare', href: '/compare', icon: GitCompareArrows },
    ],
  },
  {
    label: 'Live systems',
    items: [
      { label: 'Roads & Traffic', href: '/roads', icon: Route },
      { label: 'Weather & Rivers', href: '/hydromet', icon: CloudRain },
      { label: 'Tourism', href: '/tourism', icon: Mountain },
      { label: 'Connectivity', href: '/connectivity', icon: RadioTower },
    ],
  },
  {
    label: 'Planning',
    items: [
      { label: 'Sector Intelligence', href: '/intelligence', icon: BarChart3 },
      { label: 'Governance', href: '/governance', icon: Building2 },
      { label: 'Offline Mode', href: '/offline', icon: HardDriveDownload },
    ],
  },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  /**
   * The rail starts collapsed and expands on hover.
   *
   * `isPeeking` is the transient hover state. The
   * two are kept apart so hovering never overwrites a deliberate choice — someone who
   * expands the rail keeps it expanded when the pointer leaves.
   */
  /**
   * The rail is always collapsed on desktop and expands only while hovered or keyboard
   * focused. There is no stored preference and no toggle: the hover reveal replaced the
   * collapse button, so a persisted "expanded" state had no way to be set and every way to
   * get stuck.
   */
  const [isPeeking, setIsPeeking] = useState(false);
  const showLabels = isPeeking;



  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  return (
    <div className="min-h-screen bg-bg-light lg:flex lg:h-screen">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 text-text-light backdrop-blur lg:hidden">
        <Link href="/" className="flex min-h-11 items-center gap-3 rounded-md px-1">
          <span className="flex size-9 items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Pahad Pulse logo" className="size-full object-contain" />
            </span>
          <span>
            <span className="block font-display text-lg font-bold leading-none">Pahad Pulse</span>
            <span className="mt-1 block text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
              Uttarakhand live
            </span>
          </span>
        </Link>
        <button
          type="button"
          aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface transition-transform duration-150 active:scale-[0.96]"
        >
          <MorphIcon
            icon={isMenuOpen ? CloseIconData : MenuIconData}
            size={20}
            strokeWidth={2}
            spring={NAV_MORPH}
            reducedMotion="user"
          />
        </button>
      </header>

      {isMenuOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}

      {/* Reserves the rail's footprint so the page never reflows when the rail expands on
          hover. Without it, moving the pointer over the navigation would resize the map and
          shuffle every card beside it — the exact jitter that makes hover-to-expand feel
          broken. The spacer tracks the PREFERENCE, the rail tracks the hover. */}
      <div
        aria-hidden="true"
        className={clsx(
          'hidden lg:block lg:w-[4.75rem] lg:shrink-0'
        )}
      />

      <aside
        onMouseEnter={() => {
          setIsPeeking(true);
        }}
        onMouseLeave={() => {
          setIsPeeking(false);
        }}
        // Keyboard users get the same reveal: tabbing into the nav expands it.
        onFocusCapture={(event) => {
          // Keyboard focus only. `onFocusCapture` also fires when a link is CLICKED, and
          // that left focus sitting on the link after navigation — so `isPeeking` stayed
          // true and the rail stayed expanded even once the pointer had left. Matching
          // `:focus-visible` is what separates tabbing into the nav from clicking in it.
          const target = event.target as HTMLElement;
          if (typeof target.matches === 'function' && target.matches(':focus-visible')) {
            setIsPeeking(true);
          }
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsPeeking(false);
          }
        }}
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-rail flex-col overflow-y-auto border-r border-border bg-bg-dark text-text-light transition-[transform,width] duration-200 ease-out lg:z-40 lg:translate-x-0',
          isMenuOpen ? 'translate-x-0' : '-translate-x-full',
          // Collapsing is desktop-only: on mobile the rail is an overlay that is either
          // open or shut, so an icon-only width there would be a third state with no use.
          showLabels ? 'lg:w-rail' : 'lg:w-[4.75rem]',
          // Expanded-on-hover overlays the content rather than displacing it.
          isPeeking ? 'lg:shadow-2xl' : ''
        )}
      >
        <div
          className={clsx(
            'flex min-h-20 items-center border-b border-white/10',
            showLabels ? 'px-5' : 'lg:justify-center lg:px-0'
          )}
        >
          <Link
            href="/"
            className="flex min-h-11 items-center gap-3 rounded-md"
            title={showLabels ? undefined : 'Pahad Pulse'}
          >
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Pahad Pulse logo" className="size-full object-contain" />
            </span>
            <span className={clsx(!showLabels && 'lg:hidden')}>
              <span className="block font-display text-lg font-extrabold leading-none tracking-tight text-white">Pahad Pulse</span>
              <span className="mt-1 block text-[0.6rem] font-medium uppercase tracking-[0.2em] text-white/50">
                Uttarakhand Intelligence
              </span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsMenuOpen(false)}
            className="ml-auto flex size-11 items-center justify-center rounded-lg text-white/70 hover:text-white lg:hidden"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Collapse toggle. The icon morphs between a burger (the rail is closed, tap to
            open it) and a panel-close mark (the rail is open, tap to shrink it), so the
            control states what it will DO rather than what it currently is. */}

        <nav id="primary-navigation" aria-label="Primary" className="flex-1 space-y-6 px-3 py-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p
                className={clsx(
                  'mb-2 px-3 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-white/40',
                  !showLabels && 'lg:sr-only'
                )}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      title={showLabels ? undefined : item.label}
                      aria-label={showLabels ? undefined : item.label}
                      className={clsx(
                        'group flex min-h-10 items-center gap-3 rounded-lg text-[0.8125rem] font-medium transition-colors duration-150 active:scale-[0.98]',
                        showLabels ? 'px-3' : 'px-3 lg:justify-center lg:px-0',
                        isActive
                          ? 'bg-white/[0.12] text-white'
                          : 'text-white/60 hover:bg-white/[0.07] hover:text-white/90'
                      )}
                    >
                      <Icon
                        className={clsx(
                          'size-[1.125rem] shrink-0 transition-colors duration-150',
                          isActive
                            ? 'text-accent'
                            : 'text-white/45 group-hover:text-white/75'
                        )}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                      <span className={clsx(!showLabels && 'lg:hidden')}>{item.label}</span>
                      {isActive ? (
                        <span
                          className={clsx(
                            'ml-auto size-1.5 rounded-full bg-accent',
                            !showLabels && 'lg:hidden'
                          )}
                          aria-hidden="true"
                        />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={clsx('border-t border-white/10 py-4', showLabels ? 'px-5' : 'lg:px-0')}>
          <div
            className={clsx(
              'flex items-center gap-2 text-xs text-white/40',
              !showLabels && 'lg:justify-center'
            )}
            title={showLabels ? undefined : 'Public data portal · v0.1'}
          >
            <Gauge className="size-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
            <span className={clsx(!showLabels && 'lg:hidden')}>Public data portal</span>
            <span className={clsx('ml-auto font-mono text-[0.65rem]', !showLabels && 'lg:hidden')}>
              v0.1
            </span>
          </div>
        </div>
      </aside>

      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-auto bg-bg-light">
        {children}
      </main>
    </div>
  );
}
