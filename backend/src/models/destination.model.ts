import type { LocalisedText } from './alert.model.js';
import type { Provenance } from './source.model.js';

export const DESTINATIONS_TABLE = 'destinations';
export const ANNUAL_VISITORS_TABLE = 'destination_annual_visitors';

export type DestinationType =
  'char_dham' | 'hill_station' | 'trek' | 'wildlife' | 'religious' | 'other';

export interface AnnualVisitorRow {
  slug: string;
  type: DestinationType;
  name_en: string;
  name_hi: string;
  area_slug: string;
  area_name_en: string;
  area_name_hi: string | null;
  year: number;
  visitors: number;
  source_id: number;
  fetched_at: string;
}

/** One published yearly arrival total for one shrine. */
export interface AnnualVisitors {
  year: number;
  visitors: number;
  sourceId: number;
  /**
   * DS-2: what the figure describes is the year, so the vintage is its last day. A yearly
   * total has no finer date, and inventing one would let it be plotted as an event.
   */
  vintage: string;
  fetchedAt: string;
}

export interface DestinationVisitors {
  slug: string;
  type: DestinationType;
  name: LocalisedText;
  district: { slug: string; name: LocalisedText };
  /** Oldest year first, so a reader scans left to right through time. */
  years: Array<AnnualVisitors & { provenance: Provenance | null }>;
}

export function vintageForYear(year: number): string {
  return `${year}-12-31`;
}

export function toAnnualVisitors(row: AnnualVisitorRow): AnnualVisitors {
  return {
    year: row.year,
    visitors: row.visitors,
    sourceId: row.source_id,
    vintage: vintageForYear(row.year),
    fetchedAt: row.fetched_at,
  };
}
