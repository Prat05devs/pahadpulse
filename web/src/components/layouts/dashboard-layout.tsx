'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu as MenuIconData,
  PanelLeftClose as CollapseIconData,
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
  Map,
  Mountain,
  RadioTower,
  Route,
  Users,
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
      { label: 'Districts', href: '/districts', icon: Map },
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
      { label: 'Migration', href: '/migration', icon: Users },
      { label: 'Sector Intelligence', href: '/intelligence', icon: BarChart3 },
      { label: 'Governance', href: '/governance', icon: Building2 },
      { label: 'Offline Mode', href: '/offline', icon: HardDriveDownload },
    ],
  },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  /**
   * The collapsed state is a per-viewer convenience, so it lives in localStorage rather than
   * on the server. Read after mount, not during render: the server has no way to know it, and
   * reading it during render would produce a hydration mismatch on every visit.
   */
  useEffect(() => {
    try {
      setIsCollapsed(window.localStorage.getItem('pp:nav-collapsed') === '1');
    } catch {
      // Private windows and blocked site data throw on access. A rail that defaults to
      // expanded is a fine outcome; a layout that crashes is not.
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((collapsed) => {
      const next = !collapsed;
      try {
        window.localStorage.setItem('pp:nav-collapsed', next ? '1' : '0');
      } catch {
        // Ignored for the same reason as above — the toggle still works for this session.
      }
      return next;
    });
  };

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
          <span className="flex size-9 items-center justify-center rounded-lg bg-info-soft text-info">
            <Mountain className="size-5" aria-hidden="true" />
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

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-rail flex-col overflow-y-auto border-r border-border bg-bg-dark text-text-light transition-[transform,width] duration-200 ease-out lg:static lg:z-auto lg:translate-x-0',
          isMenuOpen ? 'translate-x-0' : '-translate-x-full',
          // Collapsing is desktop-only: on mobile the rail is an overlay that is either
          // open or shut, so an icon-only width there would be a third state with no use.
          isCollapsed ? 'lg:w-[4.75rem]' : 'lg:w-rail'
        )}
      >
        <div
          className={clsx(
            'flex min-h-24 items-center border-b border-border',
            isCollapsed ? 'lg:justify-center lg:px-0' : 'px-5'
          )}
        >
          <Link
            href="/"
            className="flex min-h-11 items-center gap-3 rounded-md"
            title={isCollapsed ? 'Pahad Pulse' : undefined}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
              <Mountain className="size-5" aria-hidden="true" />
            </span>
            <span className={clsx(isCollapsed && 'lg:hidden')}>
              <span className="block font-display text-xl font-bold leading-none">Pahad Pulse</span>
              <span className="mt-1.5 block text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                Uttarakhand public data
              </span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsMenuOpen(false)}
            className="ml-auto flex size-11 items-center justify-center rounded-lg lg:hidden"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Collapse toggle. The icon morphs between a burger (the rail is closed, tap to
            open it) and a panel-close mark (the rail is open, tap to shrink it), so the
            control states what it will DO rather than what it currently is. */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!isCollapsed}
          aria-controls="primary-navigation"
          title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          className={clsx(
            'hidden min-h-11 items-center gap-3 border-b border-border text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-surface/65 hover:text-text-light focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent lg:flex',
            isCollapsed ? 'lg:justify-center lg:px-0' : 'px-5'
          )}
        >
          <MorphIcon
            icon={isCollapsed ? MenuIconData : CollapseIconData}
            size={18}
            strokeWidth={1.8}
            spring={NAV_MORPH}
            reducedMotion="user"
          />
          <span className={clsx('py-3', isCollapsed && 'lg:hidden')}>Collapse</span>
        </button>

        <nav id="primary-navigation" aria-label="Primary" className="flex-1 space-y-5 px-3 py-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {/* Collapsed, the group heading has no room — but it still names the group for
                  a screen reader, so it is hidden visually rather than removed. */}
              <p
                className={clsx(
                  'mb-1.5 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/75',
                  isCollapsed && 'lg:sr-only'
                )}
              >
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      // The label is the accessible name when it is visible; collapsed, the
                      // title attribute carries it for pointer users and aria-label for the
                      // rest, so the link is never an unlabelled icon.
                      title={isCollapsed ? item.label : undefined}
                      aria-label={isCollapsed ? item.label : undefined}
                      className={clsx(
                        'group flex min-h-11 items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-150 active:scale-[0.98]',
                        isCollapsed ? 'px-3 lg:justify-center lg:px-0' : 'px-3',
                        isActive
                          ? 'bg-surface text-text-light shadow-card'
                          : 'text-muted-foreground hover:bg-surface/65 hover:text-text-light'
                      )}
                    >
                      <Icon
                        className={clsx(
                          'size-[1.125rem] shrink-0 transition-colors duration-150',
                          isActive
                            ? 'text-accent'
                            : 'text-muted-foreground/70 group-hover:text-accent'
                        )}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                      <span className={clsx(isCollapsed && 'lg:hidden')}>{item.label}</span>
                      {isActive ? (
                        <span
                          className={clsx(
                            'ml-auto size-1.5 rounded-full bg-accent',
                            isCollapsed && 'lg:hidden'
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

        <div className={clsx('border-t border-border py-4', isCollapsed ? 'lg:px-0' : 'px-5')}>
          <div
            className={clsx(
              'flex items-center gap-2 text-xs text-muted-foreground',
              isCollapsed && 'lg:justify-center'
            )}
            title={isCollapsed ? 'Public data portal · v0.1' : undefined}
          >
            <Gauge className="size-3.5 shrink-0 text-success" aria-hidden="true" />
            <span className={clsx(isCollapsed && 'lg:hidden')}>Public data portal</span>
            <span className={clsx('ml-auto font-mono text-[0.65rem]', isCollapsed && 'lg:hidden')}>
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
