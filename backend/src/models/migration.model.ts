import type { LocalisedText } from './alert.model.js';
import type { Provenance } from './source.model.js';

export const SURVEYS_TABLE = 'migration_surveys';
export const CATEGORIES_TABLE = 'migration_categories';
export const FIGURES_TABLE = 'migration_district_figures';
export const OBSERVATIONS_TABLE = 'migration_observations';

/**
 * The four share dimensions describe one question each and sum to 100 within a district.
 * `village_condition` is counts of villages and does not sum to anything meaningful — its
 * categories overlap by design, since a village with neither road nor power is counted in
 * both. Renderers must branch on this, which is why it is one enum and not a flag.
 */
export type MigrationDimension =
  'reason' | 'age' | 'destination' | 'occupation' | 'village_condition';

export const SHARE_DIMENSIONS = ['reason', 'age', 'destination', 'occupation'] as const;

export function isShareDimension(dimension: MigrationDimension): boolean {
  return (SHARE_DIMENSIONS as readonly string[]).includes(dimension);
}

/*
 * NOTE ON COMPARING ROUNDS.
 *
 * Only the headline counts may be read as a trend. The 2022 round changed the occupation
 * options — it merged farming, horticulture and livestock into one and introduced MGNREGA
 * and self-employment, neither of which existed as a choice in 2018 — so lining the two up
 * would be comparing different questions. `reason`, `age` and `destination` were asked in
 * 2018 only, so there is no second point to compare against at all.
 *
 * This is enforced by shape rather than by a flag: breakdowns are returned nested inside
 * their own round, so there is no cross-round breakdown structure for a client to plot.
 * `changeBetween` below is the only trend this module computes, and it takes counts.
 */

export interface SurveyRow {
  id: number;
  survey_key: string;
  label_en: string;
  label_hi: string;
  covers_from: string;
  covers_to: string;
  published_on: string;
  gram_panchayats_surveyed: number | null;
  blocks_surveyed: number | null;
  source_id: number;
  evidence_url: string;
  fetched_at: string;
}

export interface MigrationSurvey {
  key: string;
  label: LocalisedText;
  coversFrom: string;
  coversTo: string;
  publishedOn: string;
  /** The round's own coverage. Null means the report did not state it, never zero. */
  gramPanchayatsSurveyed: number | null;
  blocksSurveyed: number | null;
  evidenceUrl: string;
  sourceId: number;
  /** DS-2: what the figures DESCRIBE is the end of the field window, not the publish date. */
  vintage: string;
  fetchedAt: string;
}

export function toSurvey(row: SurveyRow): MigrationSurvey {
  return {
    key: row.survey_key,
    label: { en: row.label_en, hi: row.label_hi },
    coversFrom: row.covers_from,
    coversTo: row.covers_to,
    publishedOn: row.published_on,
    gramPanchayatsSurveyed: row.gram_panchayats_surveyed,
    blocksSurveyed: row.blocks_surveyed,
    evidenceUrl: row.evidence_url,
    sourceId: row.source_id,
    vintage: row.covers_to,
    fetchedAt: row.fetched_at,
  };
}

/** One district's headline counts in one round. */
export interface MigrationFigures {
  surveyKey: string;
  /**
   * Kept apart, never summed. A temporary migrant keeps the house and returns; a permanent
   * migrant has sold the land or locked the door. Adding them would double-count neither
   * group correctly and would describe nobody.
   */
  temporaryPersons: number;
  temporaryPanchayats: number;
  permanentPersons: number;
  permanentPanchayats: number;
  blocksReporting: number | null;
}

export interface MigrationValue {
  categoryKey: string;
  label: LocalisedText;
  note: string | null;
  /** A percentage for the share dimensions; a count of villages for `village_condition`. */
  value: number;
}

export interface MigrationBreakdown {
  dimension: MigrationDimension;
  /** True for the four share dimensions, whose values sum to 100 for this district. */
  isShare: boolean;
  /** Printed report order, so a category keeps its position when districts change. */
  values: MigrationValue[];
}

/** Everything one round found for one district. */
export interface MigrationRound {
  survey: MigrationSurvey & { provenance: Provenance | null };
  figures: MigrationFigures;
  breakdowns: MigrationBreakdown[];
}

/**
 * How a district's migration data stands.
 *
 * `covered` means both rounds surveyed it. Nothing is `partial` today — both rounds reached
 * all thirteen districts — but the state exists because the per-district reports behind the
 * rest of the dashboard do not, and every panel reads coverage the same way.
 */
export type CoverageState = 'covered' | 'partial' | 'not_yet_available';

export interface MigrationChange {
  temporaryPersons: number;
  permanentPersons: number;
  temporaryPanchayats: number;
  permanentPanchayats: number;
}

/**
 * The change between the two rounds, or null when a district lacks one of them.
 *
 * Null rather than a zero or a one-sided figure: a district surveyed once has no trend, and
 * rendering 0 would say its migration did not change, which is a different and false claim.
 */
export function changeBetween(
  earlier: MigrationFigures | undefined,
  later: MigrationFigures | undefined,
): MigrationChange | null {
  if (earlier === undefined || later === undefined) return null;
  return {
    temporaryPersons: later.temporaryPersons - earlier.temporaryPersons,
    permanentPersons: later.permanentPersons - earlier.permanentPersons,
    temporaryPanchayats: later.temporaryPanchayats - earlier.temporaryPanchayats,
    permanentPanchayats: later.permanentPanchayats - earlier.permanentPanchayats,
  };
}
