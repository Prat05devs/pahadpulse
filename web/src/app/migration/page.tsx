import React from 'react';
import type { Metadata } from 'next';
import { ExternalLink, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { StateMigrationTable, fetchStateMigration } from '@/features/migration';

export const metadata: Metadata = {
  title: 'Palayan — Migration Tracker — Pahad Pulse',
  description:
    "Out-migration from Uttarakhand's gram panchayats, from the state Migration Commission's two survey rounds.",
};

/** A day. These are two published PDF reports; they cannot change between requests, and
 *  will not change again until the commission publishes a third round. */
export const revalidate = 86400;

const n = (value: number) => value.toLocaleString('en-IN');

export default async function MigrationPage() {
  let data = null;
  let error: string | null = null;

  try {
    data = await fetchStateMigration();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Migration figures unavailable';
  }

  const first = data?.totals[0];
  const last = data?.totals[data.totals.length - 1];
  const source = data?.surveys[0]?.provenance ?? null;

  return (
    <DashboardLayout>
      <div className="min-h-full">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 md:py-6 lg:px-8">
            <p className="mb-1.5 text-sm font-medium text-muted-foreground">Published surveys</p>
            <h1 className="flex items-center gap-2 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] text-text-light sm:text-3xl">
              <Users className="size-6 text-accent" strokeWidth={1.8} aria-hidden="true" />
              Palayan — migration
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              How many people left Uttarakhand&apos;s gram panchayats, why, and where they went —
              as counted by the state&apos;s Rural Development and Migration Commission in two
              door-to-door survey rounds. Nothing here is modelled or projected.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 md:py-6 lg:px-8">
          {error !== null && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              <p className="font-semibold">Unable to load migration figures</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          {data !== null && (
            <>
              {first !== undefined && last !== undefined && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
                    <p className="text-sm text-muted-foreground">Left temporarily</p>
                    <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-text-light">
                      {n(last.temporaryPersons)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      in the latest round, against {n(first.temporaryPersons)} in the first. They
                      keep the house and come back.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
                    <p className="text-sm text-muted-foreground">Left for good</p>
                    <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-text-light">
                      {n(last.permanentPersons)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      against {n(first.permanentPersons)} in the first round — land sold, or the
                      house locked.
                    </p>
                  </div>
                </div>
              )}

              <section aria-labelledby="by-district">
                <h2
                  id="by-district"
                  className="mb-3 text-lg font-semibold tracking-tight text-text-light sm:text-xl"
                >
                  By district
                </h2>
                <StateMigrationTable data={data} />
                <p className="mt-2 text-xs text-muted-foreground">
                  The two rounds cover different windows and are counted, not estimated. A district
                  with no published figures keeps its row and says so, rather than being dropped.
                </p>
              </section>

              <section aria-labelledby="rounds">
                <h2
                  id="rounds"
                  className="mb-3 text-lg font-semibold tracking-tight text-text-light sm:text-xl"
                >
                  The surveys
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {data.surveys.map((survey) => (
                    <div key={survey.key} className="rounded-lg border border-border bg-surface p-4">
                      <p className="font-medium text-text-light">{survey.label.en}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Fieldwork covers {survey.coversFrom} to {survey.coversTo}; published{' '}
                        {survey.publishedOn}.
                        {survey.gramPanchayatsSurveyed !== null &&
                          ` Reached ${n(survey.gramPanchayatsSurveyed)} gram panchayats across ${n(survey.blocksSurveyed ?? 0)} blocks.`}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {source !== null && (
                <p className="text-xs text-muted-foreground">
                  {source.attribution}.{' '}
                  {source.url !== null && (
                    <a
                      className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-text-light"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Source
                      <ExternalLink className="size-3" strokeWidth={1.8} aria-hidden="true" />
                    </a>
                  )}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
