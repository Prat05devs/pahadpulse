import { err, ok, type Result } from 'neverthrow';

import type {
  AreaIndicatorValue,
  AreaIndicatorValueOut,
  ComparisonRowOut,
  Indicator,
  RankingEntryOut,
  SeriesPointOut,
} from '../models/indicator.model.js';
import { AreaRepository } from '../repositories/area.repository.js';
import { IndicatorRepository } from '../repositories/indicator.repository.js';
import { attachProvenance, publiclyDisplayable } from '../services/provenance.service.js';
import { AreaType } from '../types/area.js';
import { IndicatorScope } from '../types/indicator.js';
import { ERRORS, type RequestError } from '../utils/errors.js';

/** Both enums share their literal values by convention; this is the one place that assumes it. */
function scopeMatchesAreaType(scope: IndicatorScope, areaType: AreaType): boolean {
  switch (scope) {
    case IndicatorScope.State:
      return areaType === AreaType.State;
    case IndicatorScope.District:
      return areaType === AreaType.District;
    case IndicatorScope.Village:
      return areaType === AreaType.Village;
  }
}

export async function listIndicators(
  category?: string,
): Promise<Result<Indicator[], RequestError>> {
  return IndicatorRepository.listCatalogue(category);
}

/** One area's indicators: the ones we have, and the ones we do not have yet. */
export interface AreaIndicators {
  values: AreaIndicatorValueOut[];
  /**
   * Catalogue indicators in scope for this area type that have no value for it.
   *
   * Returned so a district page can SAY a figure is still being compiled instead of simply
   * not drawing a row. An absent row is indistinguishable from a broken page, and a reader
   * who cannot tell the difference learns to distrust both. This is also the honest answer:
   * the catalogue is the list of figures the product intends to carry, so an entry with no
   * value is a known gap rather than a question nobody asked.
   *
   * An indicator dropped by DS-6 — present, but from a source that forbids redistribution —
   * is NOT listed here. It is not being compiled; it exists and may not be shown, which is a
   * different statement, and claiming otherwise would promise a figure that will never come.
   */
  pending: Indicator[];
}

/**
 * Every indicator with a stored value for one area, provenance-stamped, plus the ones with
 * no value yet.
 *
 * Values whose source may not be redistributed are dropped (DS-6), not merely hidden
 * client-side — the API itself never emits them.
 */
export async function getAreaIndicators(
  areaSlug: string,
  now?: Date,
): Promise<Result<AreaIndicators, RequestError>> {
  const area = await AreaRepository.findBySlug(areaSlug);
  if (area.isErr()) return err(area.error);

  const values = await IndicatorRepository.latestValuesForArea(area.value.id);
  if (values.isErr()) return err(values.error);

  const stamped = await attachProvenance(values.value, now);
  if (stamped.isErr()) return err(stamped.error);

  const visible = publiclyDisplayable(stamped.value);

  const catalogue = await IndicatorRepository.listCatalogue();
  if (catalogue.isErr()) return err(catalogue.error);

  // Held before DS-6 filtering, so a redistribution-blocked indicator is not reported as
  // "coming soon" — we have that figure and may not publish it, which is not the same thing.
  const held = new Set(values.value.map((value) => value.indicator.key));

  const pending = catalogue.value.filter(
    (indicator) =>
      scopeMatchesAreaType(indicator.scope, area.value.type) && !held.has(indicator.key),
  );

  return ok({ values: visible, pending });
}

export interface ComparisonResult {
  rows: ComparisonRowOut[];
  omittedCount: number;
}

/**
 * Two areas' latest values, matched by indicator (IND-5): a row appears only when BOTH
 * areas have a value. `omittedCount` reports how many indicators were dropped for having
 * only one side.
 */
export async function compareAreas(
  slugA: string,
  slugB: string,
  categories: readonly string[] | undefined,
  now?: Date,
): Promise<Result<ComparisonResult, RequestError>> {
  if (slugA === slugB) return err(ERRORS.COMPARISON_REQUIRES_TWO_AREAS);

  const [areaA, areaB] = await Promise.all([
    AreaRepository.findBySlug(slugA),
    AreaRepository.findBySlug(slugB),
  ]);
  if (areaA.isErr()) return err(areaA.error);
  if (areaB.isErr()) return err(areaB.error);

  // IND-4 — comparison is only permitted between areas of the same type.
  if (areaA.value.type !== areaB.value.type) {
    return err(ERRORS.COMPARISON_AREA_TYPE_MISMATCH);
  }

  const [valuesA, valuesB] = await Promise.all([
    IndicatorRepository.latestValuesForArea(areaA.value.id),
    IndicatorRepository.latestValuesForArea(areaB.value.id),
  ]);
  if (valuesA.isErr()) return err(valuesA.error);
  if (valuesB.isErr()) return err(valuesB.error);

  const categorySet = categories === undefined ? null : new Set(categories);
  const keep = (indicatorCategory: string): boolean =>
    categorySet === null || categorySet.has(indicatorCategory);

  const byKeyA = new Map<string, AreaIndicatorValue>(
    valuesA.value.filter((v) => keep(v.indicator.category)).map((v) => [v.indicator.key, v]),
  );
  const byKeyB = new Map<string, AreaIndicatorValue>(
    valuesB.value.filter((v) => keep(v.indicator.category)).map((v) => [v.indicator.key, v]),
  );

  interface MatchedPair {
    indicator: Indicator;
    a: AreaIndicatorValue;
    b: AreaIndicatorValue;
  }
  const matchedPairs: MatchedPair[] = [];
  let omittedCount = 0;

  for (const key of new Set([...byKeyA.keys(), ...byKeyB.keys()])) {
    const a = byKeyA.get(key);
    const b = byKeyB.get(key);
    if (a === undefined || b === undefined) {
      omittedCount += 1; // IND-5 — a one-sided row is misleading, not shown
      continue;
    }
    matchedPairs.push({ indicator: a.indicator, a, b });
  }

  const [stampedA, stampedB] = await Promise.all([
    attachProvenance(
      matchedPairs.map((m) => m.a),
      now,
    ),
    attachProvenance(
      matchedPairs.map((m) => m.b),
      now,
    ),
  ]);
  if (stampedA.isErr()) return err(stampedA.error);
  if (stampedB.isErr()) return err(stampedB.error);

  const rows: ComparisonRowOut[] = matchedPairs.flatMap((pair, index) => {
    const stampA = stampedA.value[index];
    const stampB = stampedB.value[index];
    if (stampA === undefined || stampB === undefined) return [];
    return [{ indicator: pair.indicator, areaA: stampA, areaB: stampB }];
  });

  return ok({ rows, omittedCount });
}

export async function getSeries(
  indicatorKey: string,
  areaSlug: string,
  now?: Date,
): Promise<Result<SeriesPointOut[], RequestError>> {
  const indicator = await IndicatorRepository.findByKey(indicatorKey);
  if (indicator.isErr()) return err(indicator.error);

  const area = await AreaRepository.findBySlug(areaSlug);
  if (area.isErr()) return err(area.error);

  if (!scopeMatchesAreaType(indicator.value.scope, area.value.type)) {
    return err(ERRORS.INDICATOR_SCOPE_NOT_SUPPORTED);
  }

  const points = await IndicatorRepository.seriesForAreaIndicator(indicatorKey, area.value.id);
  if (points.isErr()) return err(points.error);

  const stamped = await attachProvenance(points.value, now);
  if (stamped.isErr()) return err(stamped.error);

  return ok(publiclyDisplayable(stamped.value));
}

export interface RankingResult {
  indicator: Indicator;
  vintage: string;
  data: RankingEntryOut[];
  pagination: { hasNext: boolean; nextCursor: number | null };
}

/**
 * Ranks every area of the indicator's scope at one vintage (IND-6: never mixes vintages).
 * When `vintage` is omitted, the most recent vintage with any data is used; if the
 * indicator has never had a value at all, there is no vintage to anchor a ranking to.
 */
export async function getRanking(
  indicatorKey: string,
  vintage: string | undefined,
  cursor: number,
  limit: number,
  now?: Date,
): Promise<Result<RankingResult, RequestError>> {
  const indicator = await IndicatorRepository.findByKey(indicatorKey);
  if (indicator.isErr()) return err(indicator.error);

  let resolvedVintage = vintage;
  if (resolvedVintage === undefined) {
    const latest = await IndicatorRepository.latestVintageFor(indicatorKey);
    if (latest.isErr()) return err(latest.error);
    if (latest.value === null) return err(ERRORS.INDICATOR_VALUE_NOT_AVAILABLE);
    resolvedVintage = latest.value;
  }

  const page = await IndicatorRepository.ranking(indicator.value, resolvedVintage, {
    cursor,
    limit,
  });
  if (page.isErr()) return err(page.error);

  const stamped = await attachProvenance(page.value.data, now);
  if (stamped.isErr()) return err(stamped.error);

  return ok({
    indicator: indicator.value,
    vintage: resolvedVintage,
    data: publiclyDisplayable(stamped.value),
    pagination: page.value.pagination,
  });
}
