import type { BusinessWeights, ComparisonDistrict, ComparisonReport } from './schemas';

/**
 * The two readings of a comparison report that the screen must not get wrong.
 *
 * Both were wrong once, and both were wrong in the same direction — claiming more than the
 * data supports. They live here, away from the layout, so they can be tested without a
 * renderer: the screen's modals and animated controls cannot be driven under jest-expo.
 */

export type ComparisonOutcome =
  | { kind: 'district'; name: string }
  | { kind: 'tie' }
  | { kind: 'insufficient' };

/**
 * `winner` has three shapes: a district slug, `tie`, or `insufficient`.
 *
 * `insufficient` is the API declining to recommend, because the evidence covers less than
 * half the weight the chosen business type asks for. Testing only for `tie` — as this
 * screen did — let that case fall through to the slug comparison, where it matched neither
 * district and so named district B as recommended. That is the API's refusal reported as
 * its opposite.
 */
export function outcomeOf(report: ComparisonReport): ComparisonOutcome {
  if (report.winner === 'insufficient') return { kind: 'insufficient' };
  if (report.winner === 'tie') return { kind: 'tie' };
  return {
    kind: 'district',
    name: report.winner === report.districtA.slug ? report.districtA.name : report.districtB.name,
  };
}

export interface MetricReading {
  /** False when nothing has been measured, in which case `score` must not be shown. */
  available: boolean;
  score: number;
}

/**
 * What one metric may claim for one district.
 *
 * `metrics` carries a neutral 50 wherever nothing has been measured, so that the weighted
 * index can still be computed. Drawing that 50 as a bar told the reader that a district's
 * roads scored 50 out of 100 when its roads have never been scored at all.
 *
 * An API response without `metricDetails` predates this build: its numbers are all there
 * is, so they are shown as before rather than blanking the whole screen.
 */
export function readMetric(
  district: ComparisonDistrict,
  key: keyof BusinessWeights
): MetricReading {
  const detail = district.metricDetails?.[key];
  if (detail?.available === false) return { available: false, score: 0 };
  return { available: true, score: detail?.score ?? district.metrics[key] ?? 0 };
}
