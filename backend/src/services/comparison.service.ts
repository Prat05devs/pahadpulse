/**
 * District comparison — the scoring layer.
 *
 * WHAT THIS IS ALLOWED TO CLAIM.
 *
 * Every number here is DERIVED by Pahad Pulse, not published by anyone. That makes it the
 * most dangerous thing on the platform: a score reads as authoritative whether or not it
 * has earned it, and an investor or a student may act on it. So the rules are strict.
 *
 *   1. An indicator with no DIRECTION is never scored. `sex_ratio` and `population` have
 *      `higher_is_better = null` because there is no better value — a district is not
 *      superior for being larger. They travel as context and are shown, never ranked.
 *   2. A score is a POSITION AMONG THE 13 DISTRICTS, not a mark out of 100. 0 is the lowest
 *      district on that indicator and 100 the highest, so "62" means "roughly two thirds of
 *      the way up the state on this measure" and nothing else.
 *   3. Counts are normalised before they are compared. Haridwar has more schools than
 *      Rudraprayag mostly because it has more people, and ranking the raw count would
 *      measure population wearing the label "education".
 *   4. Every theme reports how many indicators it rests on. A theme resting on one is
 *      that indicator restated, and the UI has to be able to say so.
 *   5. A theme with no scoreable data returns null. It is never zero — zero is a position
 *      at the bottom of the state, and "we have no data" is not that.
 */
import type { IndicatorCategory } from '../types/indicator.js';

/** How a count is made comparable between districts of very different size. */
export type Normalisation = 'none' | 'per_capita' | 'per_1000_people';

export interface ScoreInput {
  indicatorKey: string;
  label: string;
  unit: string;
  /** null means the indicator has no direction and must not be scored. */
  higherIsBetter: boolean | null;
  normalisation: Normalisation;
  /** Every district's raw value, so a position can be computed against the whole state. */
  valuesBySlug: Readonly<Record<string, number>>;
  /** Population per district, required only when normalising. */
  populationBySlug?: Readonly<Record<string, number>>;
  vintage: string;
  sourceLabel: string | null;
}

export interface IndicatorScore {
  indicatorKey: string;
  label: string;
  unit: string;
  /** The value as published, for display beside the score. */
  rawValue: number;
  /** After normalisation — what was actually ranked. Equal to `rawValue` when 'none'. */
  comparedValue: number;
  normalisation: Normalisation;
  /** 0-100 position among the districts that have this indicator. */
  score: number;
  /** 1 is the best district in the state on this measure. */
  rank: number;
  outOf: number;
  vintage: string;
  sourceLabel: string | null;
}

export interface ThemeScore {
  theme: IndicatorCategory;
  /** null when nothing in this theme could be scored — never 0. */
  score: number | null;
  /** How many indicators the score rests on. One means "this is that indicator". */
  basedOn: number;
  indicators: IndicatorScore[];
}

function normalise(input: ScoreInput, slug: string, raw: number): number | null {
  if (input.normalisation === 'none') return raw;

  const population = input.populationBySlug?.[slug];
  // Refuses rather than guesses: a per-capita figure without a population is not a
  // per-capita figure, and falling back to the raw count would silently rank population.
  if (population === undefined || population <= 0) return null;

  return input.normalisation === 'per_1000_people'
    ? (raw / population) * 1000
    : raw / population;
}

/**
 * Position on a 0-100 scale, by min-max across the districts that have the indicator.
 *
 * Min-max rather than a percentile rank because the gaps carry meaning: per-capita income in
 * Uttarakhand is not evenly spread, and a percentile would render a district that is far
 * ahead as merely one place ahead. Where every district is identical the spread is zero and
 * everyone scores 50 — the honest answer, and it avoids dividing by zero.
 */
function positionScores(values: ReadonlyArray<[string, number]>, higherIsBetter: boolean) {
  const numbers = values.map(([, value]) => value);
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const spread = max - min;

  const ranked = [...values].sort((a, b) =>
    higherIsBetter ? b[1] - a[1] : a[1] - b[1],
  );
  const rankBySlug = new Map(ranked.map(([slug], index) => [slug, index + 1]));

  const scoreBySlug = new Map<string, number>();
  for (const [slug, value] of values) {
    if (spread === 0) {
      scoreBySlug.set(slug, 50);
      continue;
    }
    const fraction = (value - min) / spread;
    scoreBySlug.set(slug, Math.round((higherIsBetter ? fraction : 1 - fraction) * 100));
  }

  return { scoreBySlug, rankBySlug };
}

/** Scores one indicator for one district, or null when it cannot honestly be scored. */
export function scoreIndicator(input: ScoreInput, slug: string): IndicatorScore | null {
  // Rule 1: no direction, no score.
  if (input.higherIsBetter === null) return null;

  const raw = input.valuesBySlug[slug];
  if (raw === undefined) return null;

  const comparable: Array<[string, number]> = [];
  for (const [otherSlug, value] of Object.entries(input.valuesBySlug)) {
    const normalised = normalise(input, otherSlug, value);
    if (normalised !== null) comparable.push([otherSlug, normalised]);
  }

  const own = normalise(input, slug, raw);
  if (own === null || comparable.length < 2) return null;

  const { scoreBySlug, rankBySlug } = positionScores(comparable, input.higherIsBetter);
  const score = scoreBySlug.get(slug);
  const rank = rankBySlug.get(slug);
  if (score === undefined || rank === undefined) return null;

  return {
    indicatorKey: input.indicatorKey,
    label: input.label,
    unit: input.unit,
    rawValue: raw,
    comparedValue: own,
    normalisation: input.normalisation,
    score,
    rank,
    outOf: comparable.length,
    vintage: input.vintage,
    sourceLabel: input.sourceLabel,
  };
}

/**
 * A theme's score: the mean of its indicator positions.
 *
 * An unweighted mean, deliberately. Any weighting would be an editorial claim about which
 * measure matters more — exactly the kind of invented rule this platform forbids — and it
 * would be invisible in the output. An equal mean is at least reproducible by anyone
 * looking at the listed indicators.
 */
export function scoreTheme(
  theme: IndicatorCategory,
  inputs: readonly ScoreInput[],
  slug: string,
): ThemeScore {
  const indicators = inputs
    .map((input) => scoreIndicator(input, slug))
    .filter((entry): entry is IndicatorScore => entry !== null);

  if (indicators.length === 0) {
    // Rule 5: absent, not zero.
    return { theme, score: null, basedOn: 0, indicators: [] };
  }

  const mean =
    indicators.reduce((total, entry) => total + entry.score, 0) / indicators.length;

  return {
    theme,
    score: Math.round(mean),
    basedOn: indicators.length,
    indicators,
  };
}
