import { err, ok, type Result } from 'neverthrow';

import {
  changeBetween,
  type CoverageState,
  type MigrationChange,
  type MigrationFigures,
  type MigrationRound,
  type MigrationSurvey,
} from '../models/migration.model.js';
import type { Provenance } from '../models/source.model.js';
import { AreaRepository } from '../repositories/area.repository.js';
import { MigrationRepository } from '../repositories/migration.repository.js';
import { attachProvenance, publiclyDisplayable } from '../services/provenance.service.js';
import type { RequestError } from '../utils/errors.js';

type StampedSurvey = MigrationSurvey & { provenance: Provenance | null };

/**
 * One district's migration record.
 *
 * `coverage` is answered for every district, including those with nothing to show. A panel
 * that renders blank cannot be told apart from one that is broken, and a district silently
 * dropped from a comparison makes the comparison wrong without saying so. So absence is a
 * value here, carried with the reason for it, and the UI states it.
 */
export interface AreaMigration {
  coverage: CoverageState;
  /** Why there is nothing, in the district's own terms. Null when the data is present. */
  coverageNote: string | null;
  rounds: MigrationRound[];
  /**
   * Between the earliest and latest round this district has. Null when it has fewer than
   * two — a district surveyed once has no trend, and a zero would claim it did not change.
   */
  change: MigrationChange | null;
}

const NOT_YET_SURVEYED =
  'The migration commission has not published figures for this district. We are working on it, and this panel will fill in when they are available.';

/** The state picture: every district's headline counts, and what changed between rounds. */
export interface StateMigration {
  surveys: StampedSurvey[];
  districts: Array<{
    slug: string;
    name: { en: string; hi: string | null };
    coverage: CoverageState;
    figures: MigrationFigures[];
    change: MigrationChange | null;
  }>;
  /**
   * State totals, summed from the districts actually served rather than copied from the
   * report. If DS-6 removes a source, this total moves with the districts on screen instead
   * of contradicting them.
   */
  totals: Array<{ surveyKey: string; temporaryPersons: number; permanentPersons: number }>;
}

/** Coverage from how many rounds a district has, against how many are being served. */
function coverageOf(have: number, expected: number): CoverageState {
  if (have === 0) return 'not_yet_available';
  return have < expected ? 'partial' : 'covered';
}

async function stampSurveys(
  surveys: MigrationSurvey[],
  now?: Date,
): Promise<Result<StampedSurvey[], RequestError>> {
  const stamped = await attachProvenance(surveys, now);
  if (stamped.isErr()) return err(stamped.error);
  // DS-6: a round whose source forbids redistribution is not served, and its figures go
  // with it — which is why the rounds below are filtered by the surveys that survive.
  return ok(publiclyDisplayable(stamped.value));
}

/** Everything both rounds found for one district, with its coverage stated either way. */
export async function getAreaMigration(
  areaSlug: string,
  now?: Date,
): Promise<Result<AreaMigration, RequestError>> {
  // Resolved first, so that an unknown slug is a 404 rather than a district that merely
  // has no figures yet. Those are different answers and the caller must be able to tell
  // them apart — "we have not published this" is only true of a place that exists.
  const area = await AreaRepository.findBySlug(areaSlug);
  if (area.isErr()) return err(area.error);

  const surveys = await MigrationRepository.listSurveys();
  if (surveys.isErr()) return err(surveys.error);

  const visible = await stampSurveys(surveys.value, now);
  if (visible.isErr()) return err(visible.error);

  const data = await MigrationRepository.findForArea(areaSlug);
  if (data.isErr()) return err(data.error);

  const rounds: MigrationRound[] = [];
  for (const survey of visible.value) {
    const figures = data.value.figures.get(survey.key);
    if (figures === undefined) continue;
    rounds.push({
      survey,
      figures,
      breakdowns: data.value.breakdowns.get(survey.key) ?? [],
    });
  }

  const coverage = coverageOf(rounds.length, visible.value.length);

  return ok({
    coverage,
    coverageNote: coverage === 'covered' ? null : NOT_YET_SURVEYED,
    rounds,
    change: changeBetween(rounds.at(0)?.figures, rounds.at(-1)?.figures),
  });
}

/**
 * Every district, whether or not it has figures.
 *
 * Districts with no data are returned with an empty `figures` array and a coverage state,
 * never omitted. A comparison built from this list therefore has the same thirteen rows
 * whatever the data does, and can say which of them it cannot answer for.
 */
export async function listStateMigration(
  now?: Date,
): Promise<Result<StateMigration, RequestError>> {
  const surveys = await MigrationRepository.listSurveys();
  if (surveys.isErr()) return err(surveys.error);

  const visible = await stampSurveys(surveys.value, now);
  if (visible.isErr()) return err(visible.error);
  const visibleKeys = new Set(visible.value.map((survey) => survey.key));

  const districts = await AreaRepository.listDistricts();
  if (districts.isErr()) return err(districts.error);

  const figures = await MigrationRepository.listFigures();
  if (figures.isErr()) return err(figures.error);

  const totals = new Map<string, { temporaryPersons: number; permanentPersons: number }>();

  const rows = districts.value.map((district) => {
    const bySurvey = figures.value.get(district.slug);
    const own = visible.value
      .map((survey) => bySurvey?.get(survey.key))
      .filter((entry): entry is MigrationFigures => entry !== undefined);

    for (const entry of own) {
      const running = totals.get(entry.surveyKey) ?? { temporaryPersons: 0, permanentPersons: 0 };
      running.temporaryPersons += entry.temporaryPersons;
      running.permanentPersons += entry.permanentPersons;
      totals.set(entry.surveyKey, running);
    }

    return {
      slug: district.slug,
      name: district.name,
      coverage: coverageOf(own.length, visibleKeys.size),
      figures: own,
      change: changeBetween(own.at(0), own.at(-1)),
    };
  });

  return ok({
    surveys: visible.value,
    districts: rows,
    totals: visible.value.flatMap((survey) => {
      const running = totals.get(survey.key);
      return running === undefined ? [] : [{ surveyKey: survey.key, ...running }];
    }),
  });
}
