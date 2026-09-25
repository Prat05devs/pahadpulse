'use client';

import React, { useMemo, useState } from 'react';
import { ArrowUpRight, BadgeIndianRupee, Search, ShieldCheck } from 'lucide-react';
import { useBusinessSchemes } from '../hooks';

function statusLabel(status: string): string {
  return status.replace(/-/g, ' ');
}

export function BusinessSchemeDirectory() {
  const { data, isLoading, isError } = useBusinessSchemes();
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState('');

  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('en-IN');
    return (data?.schemes ?? []).filter((scheme) => {
      const sectorMatch = !sector || scheme.sector.includes(sector);
      const queryMatch =
        !needle ||
        [scheme.name, scheme.acronym, scheme.owner, scheme.summary, ...scheme.support].some((value) =>
          value.toLocaleLowerCase('en-IN').includes(needle)
        );
      return sectorMatch && queryMatch;
    });
  }, [data, query, sector]);

  return (
    <section id="schemes" className="scroll-mt-6 border-t border-border pt-10" aria-labelledby="business-schemes-heading">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">Business support finder</p>
          <h2 id="business-schemes-heading" className="mt-1 text-2xl font-semibold tracking-tight text-text-light">
            Schemes available to Uttarakhand entrepreneurs
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            National startup and MSME programmes usable from Uttarakhand, plus the official state startup-policy gateway. Status tells you whether access is direct, lender-routed, call-based or closed.
          </p>
        </div>
        {data ? (
          <div className="shrink-0 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
            <span className="font-semibold text-text-light">{data.total} verified records</span>
            <span className="ml-2 text-muted-foreground">checked {data.verifiedOn}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2">
        <label className="relative block">
          <span className="sr-only">Search schemes</span>
          <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by scheme, benefit or department"
            className="min-h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <label>
          <span className="sr-only">Filter by sector</span>
          <select
            value={sector}
            onChange={(event) => setSector(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">All sectors</option>
            {data?.sectors.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      {isLoading ? <p className="mt-5 text-sm text-muted-foreground">Loading verified schemes…</p> : null}
      {isError ? <p className="mt-5 text-sm text-danger">The scheme directory is temporarily unavailable.</p> : null}
      {data && matches.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">No schemes match these filters.</p> : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {matches.slice(0, 12).map((scheme) => (
          <article key={scheme.slug} className="surface-card flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success">
                <BadgeIndianRupee className="size-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[0.68rem] font-semibold capitalize text-muted-foreground">
                {statusLabel(scheme.status)}
              </span>
            </div>
            <h3 className="mt-4 text-base font-semibold text-text-light">{scheme.name}</h3>
            <p className="mt-1 text-xs font-medium text-accent">{scheme.owner}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{scheme.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {scheme.support.slice(0, 3).map((item) => (
                <span key={item} className="rounded-full border border-border px-2.5 py-1 text-xs capitalize text-muted-foreground">{item}</span>
              ))}
            </div>
            <p className="mt-4 flex gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              {scheme.availability}
            </p>
            <a
              href={scheme.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Official route <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>
      {matches.length > 12 ? (
        <p className="mt-4 text-sm text-muted-foreground">Showing the first 12 of {matches.length} matching records. Refine the search to narrow the list.</p>
      ) : null}
      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        Scheme existence does not guarantee an open application window or approval. Always confirm the current notification on the linked official portal.
      </p>
    </section>
  );
}
