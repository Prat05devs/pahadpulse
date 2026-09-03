import type { RowDataPacket } from 'mysql2';

import type { Provenance } from './source.model.js';
import type { IndicatorCategory, IndicatorScope } from '../types/indicator.js';

export const INDICATORS_TABLE = 'indicators';
export const INDICATOR_VALUES_TABLE = 'indicator_values';

export interface IndicatorRow extends RowDataPacket {
  id: number;
  indicator_key: string;
  category: IndicatorCategory;
  scope: IndicatorScope;
  label_en: string;
  label_hi: string;
  unit: string;
  decimals: number;
  higher_is_better: number | null;
}

/** An indicator joined to one value — the shape of "latest per indicator for an area". */
export interface IndicatorWithValueRow extends IndicatorRow {
  value: string; // DECIMAL comes back as a string from mysql2
  vintage: string; // DATE as 'YYYY-MM-DD' (dateStrings: true)
  source_id: number;
  fetched_at: string;
}

/** One district's value for a ranking table, joined to its area identity. */
export interface RankingRow extends RowDataPacket {
  area_id: number;
  area_slug: string;
  area_name_en: string;
  area_name_hi: string;
  value: string;
  vintage: string;
  source_id: number;
  fetched_at: string;
}

/** One point on a trend line for a single area + indicator. */
export interface SeriesPointRow extends RowDataPacket {
  value: string;
  vintage: string;
  source_id: number;
  fetched_at: string;
}

/** Result of a bare `MAX(vintage)` aggregate. */
export interface MaxVintageRow extends RowDataPacket {
  max_vintage: string | null;
}

export interface LocalisedText {
  en: string;
  hi: string;
}

export interface Indicator {
  key: string;
  category: IndicatorCategory;
  scope: IndicatorScope;
  label: LocalisedText;
  unit: string;
  decimals: number;
  /** Null when the indicator has no meaningful direction (e.g. population, sex ratio). */
  higherIsBetter: boolean | null;
}

/** What every value carries before provenance is attached (matches HasProvenance). */
export interface RawValuePoint {
  value: number;
  vintage: string;
  sourceId: number;
  fetchedAt: string;
}

export interface AreaIndicatorValue extends RawValuePoint {
  indicator: Indicator;
}

export interface RankingEntry extends RawValuePoint {
  rank: number;
  area: { id: number; slug: string; name: LocalisedText };
}

export type SeriesPoint = RawValuePoint;

/** One row of a two-area comparison. Present only when BOTH areas have a value (IND-5). */
export interface ComparisonRow {
  indicator: Indicator;
  areaA: RawValuePoint;
  areaB: RawValuePoint;
}

/** Provenance-stamped output shapes — what the controllers actually return. */
export type AreaIndicatorValueOut = AreaIndicatorValue & { provenance: Provenance | null };
export type SeriesPointOut = SeriesPoint & { provenance: Provenance | null };
export type RankingEntryOut = RankingEntry & { provenance: Provenance | null };
export interface ComparisonRowOut {
  indicator: Indicator;
  areaA: RawValuePoint & { provenance: Provenance | null };
  areaB: RawValuePoint & { provenance: Provenance | null };
}

function toIndicator(row: IndicatorRow): Indicator {
  return {
    key: row.indicator_key,
    category: row.category,
    scope: row.scope,
    label: { en: row.label_en, hi: row.label_hi },
    unit: row.unit,
    decimals: row.decimals,
    higherIsBetter: row.higher_is_better === null ? null : Boolean(row.higher_is_better),
  };
}

export { toIndicator };
