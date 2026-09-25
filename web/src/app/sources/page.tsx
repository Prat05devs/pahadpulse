import React from 'react';
import { BookOpenCheck, Database, ExternalLink, ShieldAlert } from 'lucide-react';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { fetchSources } from '@/features/sources/services';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'References & Data Sources',
  description:
    'Every dataset Pahad Pulse reads, the department that publishes it, its licence and a link to the original source.',
  path: '/sources',
  keywords: ['Uttarakhand open data sources', 'Pahad Pulse data sources'],
});

/** The registry changes when a dataset is added or its terms are confirmed, not hourly. */
export const revalidate = 3600;

const PUBLIC_SOURCE_NOTES: Readonly<Record<string, string>> = {
  'mopr-lgd-villages':
    'Canonical directory for village names, LGD codes and administrative relationships. It does not contain village boundary polygons.',
  'census-2011':
    'Latest completed Census enumeration. It remains useful historical evidence, but must not be presented as a current population estimate.',
  'mohfw-population-projections':
    'A modelled state population projection based on Census 2011, not a new headcount and not available as comparable district totals.',
  'mospi-plfs-2023-24':
    'A sample-survey literacy estimate for people aged seven and above; methodology differs from a decennial Census.',
  'uk-budget-directorate':
    'Budget estimates describe planned allocations, not actual expenditure. Each year remains linked to its primary Budget Directorate document.',
  'ookla-open-data':
    'Observed speed-test performance from participating devices, not advertised speed or a complete network-coverage map.',
};

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
              References &amp; data sources
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The source register behind every published figure: who produced it, how it was
              obtained, when it applies, and what its limitations are. Links open the original
              government publication or public-data record.
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

          <section className="surface-card p-4 sm:p-5" aria-labelledby="method-heading">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
                <BookOpenCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="method-heading" className="font-semibold text-text-light">
                  How figures are selected
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Government departments and national statistical agencies are the canonical
                  sources. Census counts remain labelled as Census 2011; projections, surveys and
                  administrative directories are shown as different measures and are never presented
                  as a new Census. News publications may help discover a release, but a figure is
                  registered only when its underlying government source can be linked.
                </p>
              </div>
            </div>
            <dl className="mt-5 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="font-medium text-text-light">Village directory</dt>
                <dd className="mt-1 leading-relaxed text-muted-foreground">
                  LGD names and codes define administrative coverage. Map geometry is tracked
                  separately and never used to decide whether a village exists.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-text-light">Missing district values</dt>
                <dd className="mt-1 leading-relaxed text-muted-foreground">
                  A missing value stays marked unavailable until a comparable, named publication
                  covers that district. State estimates are not copied into districts.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-text-light">Vintage</dt>
                <dd className="mt-1 leading-relaxed text-muted-foreground">
                  The vintage is the period the data describes, not the day this platform fetched
                  it. Live feeds additionally show their last successful retrieval.
                </dd>
              </div>
            </dl>
          </section>

          {error !== null && (
            <p className="text-sm text-muted-foreground" role="alert">
              The source registry could not be loaded — {error}
            </p>
          )}

          {sources !== null && (
            <section aria-labelledby="registry-heading">
              <div className="mb-3 flex items-center gap-2">
                <Database className="size-5 text-accent" aria-hidden="true" />
                <h2 id="registry-heading" className="font-semibold text-text-light">
                  Registered references ({sources.length})
                </h2>
              </div>
              <ul className="space-y-3">
                {sources.map((source) => (
                  <li key={source.key} className="surface-card p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-semibold text-text-light">{source.department.en}</h3>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        {source.cadence} · {source.accessMethod}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{source.attribution}</p>
                    <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <div>
                        <dt className="font-medium text-text-light">Licence</dt>
                        <dd className="mt-0.5 leading-relaxed">{source.licence}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-text-light">Latest registered vintage</dt>
                        <dd className="mt-0.5">
                          {source.lastVintage ?? 'No automated retrieval recorded'}
                        </dd>
                      </div>
                    </dl>
                    {PUBLIC_SOURCE_NOTES[source.key] !== undefined && (
                      <p className="mt-3 border-l-2 border-border pl-3 text-xs leading-relaxed text-muted-foreground">
                        {PUBLIC_SOURCE_NOTES[source.key]}
                      </p>
                    )}
                    {source.url !== null && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                      >
                        Open official source
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
