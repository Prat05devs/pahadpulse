import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck,
  GitCompareArrows,
  Landmark,
  MountainSnow,
  Sparkles,
} from 'lucide-react';

const supportingTools = [
  {
    title: 'Trip check',
    description:
      'Official warnings, rain forecast, mobile signal and helplines for any place on your travel date.',
    href: '/trip-check',
    icon: CalendarCheck,
  },
  {
    title: 'Char Dham journey planner',
    description:
      'Routes, visitor history, official guidance and map directions for pilgrimage travel.',
    href: '/tourism',
    icon: MountainSnow,
  },
  {
    title: 'Budget explorer',
    description: 'Trace state expenditure history and current department-wise budget estimates.',
    href: '/governance#public-finance',
    icon: Landmark,
  },
  {
    title: 'Indicator catalogue',
    description: 'Find published district evidence by sector, audience, coverage and vintage.',
    href: '/intelligence',
    icon: BarChart3,
  },
] as const;

export function DecisionToolsShowcase() {
  return (
    <section aria-labelledby="decision-tools-heading">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            <Sparkles className="size-4" aria-hidden="true" /> Tools built on public data
          </p>
          <h2
            id="decision-tools-heading"
            className="mt-2 max-w-2xl font-display text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Move from published figures to a practical decision
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          Compare places, test business ideas and trace the evidence behind every result. These
          tools organise public information; they do not hide missing data or manufacture certainty.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <article className="relative isolate overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-6 text-text-light shadow-card sm:p-8">
          <div className="absolute -right-20 -top-28 -z-10 size-80 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 -z-10 size-72 rounded-full bg-indigo-200/40 blur-3xl" />
          <span className="flex size-12 items-center justify-center rounded-xl bg-white/80 text-sky-700 shadow-sm ring-1 ring-inset ring-sky-200">
            <GitCompareArrows className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            District comparison engine
          </p>
          <h3 className="mt-2 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            See how two Uttarakhand districts actually compare
          </h3>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Benchmark any two districts across comparable demographics, development, infrastructure
            and economic indicators. Every row carries its source and vintage, and unavailable
            evidence stays unavailable instead of becoming a false zero.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/compare"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
            >
              Compare two districts <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/compare#business"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-sky-200 bg-white/80 px-4 text-sm font-semibold text-accent transition-colors hover:bg-white"
            >
              Evaluate a business idea
            </Link>
          </div>
          <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-sky-100 pt-5 text-sm">
            <div>
              <dt className="text-muted-foreground">Coverage</dt>
              <dd className="mt-1 font-semibold text-text-light">13 districts</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Business models</dt>
              <dd className="mt-1 font-semibold text-text-light">51 scenarios</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Method</dt>
              <dd className="mt-1 font-semibold text-text-light">Source-visible</dd>
            </div>
          </dl>
        </article>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Link
            href="/compare#business"
            className="interactive-card group rounded-2xl border border-border bg-surface p-6 shadow-card"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-success-soft text-success">
              <BriefcaseBusiness className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-success">
              Business opportunity engine
            </p>
            <h3 className="mt-2 text-xl font-semibold">Find the better-supported location</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Match a venture model with district evidence, relevant state budget priorities and
              government support schemes—without presenting suitability as guaranteed profit.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">
              Test a venture{' '}
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </Link>

          <Link
            href="/compare#schemes"
            className="interactive-card group rounded-2xl border border-border bg-surface p-6 shadow-card"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-warning-soft text-warning">
              <BadgeIndianRupee className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-warning">
              Scheme finder
            </p>
            <h3 className="mt-2 text-xl font-semibold">Discover support for a new enterprise</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Search verified finance, subsidy, guarantee, training and market-access programmes,
              with official application routes and eligibility guidance.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">
              Explore support schemes{' '}
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {supportingTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className="interactive-card group flex items-start gap-4 rounded-xl border border-border bg-surface p-5"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-accent">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="flex items-center gap-2 font-semibold">
                  {tool.title}
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-1.5 block text-sm leading-5 text-muted-foreground">
                  {tool.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
