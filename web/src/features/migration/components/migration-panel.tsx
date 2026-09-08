import React from 'react';
import { ArrowDownRight, ArrowUpRight, ExternalLink, Minus } from 'lucide-react';
import type { AreaMigration } from '../schemas';
import { CoverageNotice } from './coverage-notice';
import { ShareBars } from './share-bars';

const n = (value: number) => value.toLocaleString('en-IN');

/**
 * The direction a count moved between the rounds.
 *
 * Reducing out-migration is the commission's stated purpose, so a fall is shown as the
 * favourable direction — but the arrow and the word carry that, and colour only repeats it.
 * Colour alone would leave the meaning unreadable to a colourblind reader and in print.
 */
function Change({ label, value }: { label: string; value: number }) {
  const Icon = value === 0 ? Minus : value < 0 ? ArrowDownRight : ArrowUpRight;
  const tone =
    value === 0 ? 'text-muted-foreground' : value < 0 ? 'text-success' : 'text-danger';
  return (
    <p className={`flex items-center gap-1 text-sm font-medium ${tone}`}>
      <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
      {value === 0 ? 'No change' : `${value < 0 ? 'Down' : 'Up'} ${n(Math.abs(value))}`}
      <span className="font-normal text-muted-foreground">{label}</span>
    </p>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-text-light">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

/**
 * One district's migration record.
 *
 * Temporary and permanent counts are shown as separate figures and never added. They mean
 * different things — a temporary migrant keeps the house and comes back; a permanent one has
 * sold the land — and a combined "migrants" number would describe neither group.
 */
export function MigrationPanel({ data }: { data: AreaMigration }) {
  if (data.coverage === 'not_yet_available' || data.rounds.length === 0) {
    return <CoverageNotice coverage="not_yet_available" note={data.coverageNote} subject="Migration figures" />;
  }

  const latest = data.rounds[data.rounds.length - 1];

  return (
    <div className="space-y-5">
      <CoverageNotice coverage={data.coverage} note={data.coverageNote} subject="Migration figures" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Stat
          label="Left temporarily"
          value={n(latest.figures.temporaryPersons)}
          sub={`from ${n(latest.figures.temporaryPanchayats)} gram panchayats · keep the house and return`}
        />
        <Stat
          label="Left for good"
          value={n(latest.figures.permanentPersons)}
          sub={`from ${n(latest.figures.permanentPanchayats)} gram panchayats · land sold or house locked`}
        />
      </div>

      {data.change !== null && data.rounds.length > 1 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm font-semibold text-text-light">
            Change since the first survey
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data.rounds[0].survey.label.en} → {latest.survey.label.en}
          </p>
          <div className="mt-3 space-y-1.5">
            <Change label="leaving temporarily" value={data.change.temporaryPersons} />
            <Change label="leaving for good" value={data.change.permanentPersons} />
          </div>
        </div>
      )}

      {data.rounds.map((round) => (
        <div key={round.survey.key} className="rounded-lg border border-border bg-surface p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold tracking-tight text-text-light">{round.survey.label.en}</h3>
            <p className="text-xs text-muted-foreground">
              Covers {round.survey.coversFrom} to {round.survey.coversTo}
            </p>
          </div>

          {round.breakdowns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This round published counts only — it did not repeat the detailed questions.
            </p>
          ) : (
            <div className="space-y-6">
              {round.breakdowns.map((breakdown) => (
                <ShareBars key={breakdown.dimension} breakdown={breakdown} />
              ))}
            </div>
          )}

          {round.survey.provenance !== null && (
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              {round.survey.provenance.attribution}{' '}
              {round.survey.provenance.url !== null && (
                <a
                  className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-text-light"
                  href={round.survey.provenance.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Source
                  <ExternalLink className="size-3" strokeWidth={1.8} aria-hidden="true" />
                </a>
              )}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
