import React from 'react';
import { ExternalLink, ShieldAlert } from 'lucide-react';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { fetchSources } from '@/features/sources/services';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Data Sources',
  description:
    'Every dataset Pahad Pulse reads, the department that publishes it, its licence and a link to the original source.',
  path: '/sources',
  keywords: ['Uttarakhand open data sources', 'Pahad Pulse data sources'],
});

/** The registry changes when a dataset is added or its terms are confirmed, not hourly. */
export const revalidate = 3600;

/**
 * Where every figure comes from, with the publisher's own link.
 *
 * This page is the one a reader — or a store reviewer, or a department — is sent to when
 * they ask on whose authority a number is shown. It is built from the same registry the
 * figures are stamped with rather than a hand-kept list, so a source cannot appear in the
 * product without appearing here.
 */
export default async function SourcesPage() {
  let sources = null;
  let error: string | null = null;

  try {
    sources = await fetchSources();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Sources could not be loaded';
  }

  return (
    <DashboardLayout>
      <div className="min-h-full">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
            <h1 className="font-display text-2xl font-semibold leading-tight text-text-light sm:text-3xl">
              Data sources
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Every dataset this platform reads, the department that publishes it, and a link to
              that department&rsquo;s own page. Each figure in the product names its source and the
              date it describes.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
          {/* Said plainly, and before the list: whose platform this is not. */}
          <section
            className="surface-card flex items-start gap-3 p-4 sm:p-5"
            aria-label="Disclaimer"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
              <ShieldAlert className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-text-light">An independent platform</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Pahad Pulse is not a government website or application. It is not affiliated with,
                endorsed by, or operated by the Government of Uttarakhand, the Government of India,
                or any of their departments. Government information shown here remains the property
                of the department that published it, and is linked below so it can be read at the
                source.
              </p>
            </div>
          </section>

          {error !== null && (
            <p className="text-sm text-muted-foreground" role="alert">
              The source registry could not be loaded — {error}
            </p>
          )}

          {sources !== null && (
            <ul className="space-y-3">
              {sources.map((source) => (
                <li key={source.key} className="surface-card p-4 sm:p-5">
                  <h2 className="font-semibold text-text-light">{source.department.en}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{source.attribution}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Licence: {source.licence}</p>
                  {source.url !== null && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                    >
                      {source.url}
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
