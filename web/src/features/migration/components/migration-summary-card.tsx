import React from 'react';
import Link from 'next/link';
import { ArrowRight, Users } from 'lucide-react';
import type { StateMigration } from '../schemas';

const n = (value: number) => value.toLocaleString('en-IN');

/**
 * The migration headline for the home page.
 *
 * Two counts and their direction, nothing derived. The home page has room for a fact, not an
 * argument, so the reasons and destinations stay on `/migration` where each has its source
 * beside it.
 *
 * Both rounds are named rather than reduced to a percentage. "Permanent migration fell 76%"
 * would be true and would also hide that the two rounds cover windows of different lengths —
 * ten years against four and a half. The raw pair lets a reader see that for themselves.
 */
export function MigrationSummaryCard({ data }: { data: StateMigration }) {
  const first = data.totals[0];
  const last = data.totals[data.totals.length - 1];
  if (first === undefined || last === undefined || first === last) return null;

  const firstSurvey = data.surveys.find((survey) => survey.key === first.surveyKey);
  const lastSurvey = data.surveys.find((survey) => survey.key === last.surveyKey);
  const rising = data.districts.filter(
    (district) => (district.change?.temporaryPersons ?? 0) > 0
  ).length;

  return (
    <section
      aria-labelledby="home-migration"
      className="rounded-lg border border-border bg-surface p-4 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="home-migration"
          className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-text-light sm:text-xl"
        >
          <Users className="size-5 text-accent" strokeWidth={1.8} aria-hidden="true" />
          Palayan — who is leaving
        </h2>
        <Link
          className="inline-flex items-center gap-1 text-sm font-medium text-accent underline-offset-2 hover:underline"
          href="/migration"
        >
          All districts
          <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">Left temporarily</p>
          <p className="mt-0.5 font-display text-2xl font-semibold tabular-nums text-text-light">
            {n(last.temporaryPersons)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {lastSurvey === undefined
              ? null
              : `${lastSurvey.coversFrom.slice(0, 4)}–${lastSurvey.coversTo.slice(0, 4)}`}
            , against {n(first.temporaryPersons)} in{' '}
            {firstSurvey === undefined
              ? 'the first round'
              : `${firstSurvey.coversFrom.slice(0, 4)}–${firstSurvey.coversTo.slice(0, 4)}`}
            . They keep the house and come back.
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Left for good</p>
          <p className="mt-0.5 font-display text-2xl font-semibold tabular-nums text-text-light">
            {n(last.permanentPersons)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            against {n(first.permanentPersons)} in the first round — land sold, or the house locked.
          </p>
        </div>
      </div>

      <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
        {rising === 0
          ? 'Temporary migration fell in every district between the two rounds.'
          : `Temporary migration fell in ${data.districts.length - rising} of ${data.districts.length} districts and rose in ${rising}.`}{' '}
        Counted door to door by the state Migration Commission, not modelled.
      </p>
    </section>
  );
}
