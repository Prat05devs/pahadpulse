import type { LocalisedText } from './alert.model.js';
import type { Provenance } from './source.model.js';

export const NETWORK_PERFORMANCE_TABLE = 'network_performance';

/** Fixed broadband and mobile are different products and are never averaged together. */
export type ConnectionKind = 'fixed' | 'mobile';

export interface NetworkPerformanceRow {
  area_slug: string;
  area_name_en: string;
  area_name_hi: string | null;
  kind: ConnectionKind;
  quarter_start: string;
  download_kbps: number;
  upload_kbps: number;
  latency_ms: number;
  tiles: number;
  tests: number;
  devices: number;
  source_id: number;
  fetched_at: string;
}

/**
 * How much weight a district's figure can bear.
 *
 * Ookla's sample is whoever chose to run a test. Dehradun's fixed figure rests on 17,700
 * tests and Rudraprayag's on 261 — both real, not equally certain. The API grades that
 * rather than leaving every caller to invent its own threshold and disagree with the next
 * one. The bands are deliberately coarse: this is a caution, not a confidence interval.
 */
export type SampleStrength = 'strong' | 'moderate' | 'thin';

export function sampleStrengthOf(tests: number): SampleStrength {
  if (tests >= 5000) return 'strong';
  if (tests >= 1000) return 'moderate';
  return 'thin';
}

export interface NetworkPerformance {
  kind: ConnectionKind;
  /** The quarter these measurements describe, as its first day. */
  quarterStart: string;
  /** Converted from the stored kbps at the edge; the source's own unit is kept in the table. */
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  /** The sample. Never omitted — a speed without it is an anecdote. */
  sample: { tiles: number; tests: number; devices: number; strength: SampleStrength };
  sourceId: number;
  /** DS-2: what the figure describes is the quarter, so the vintage is its last day. */
  vintage: string;
  fetchedAt: string;
}

export interface DistrictNetwork {
  slug: string;
  name: LocalisedText;
  /** Both kinds when both were measured; a kind with no tests is absent, not zeroed. */
  connections: Array<NetworkPerformance & { provenance: Provenance | null }>;
}

function quarterEnd(quarterStart: string): string {
  const start = new Date(`${quarterStart}T00:00:00Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 0));
  return end.toISOString().slice(0, 10);
}

const KBPS_PER_MBPS = 1000;

function toMbps(kbps: number): number {
  return Number((kbps / KBPS_PER_MBPS).toFixed(1));
}

export function toNetworkPerformance(row: NetworkPerformanceRow): NetworkPerformance {
  return {
    kind: row.kind,
    quarterStart: row.quarter_start,
    downloadMbps: toMbps(row.download_kbps),
    uploadMbps: toMbps(row.upload_kbps),
    latencyMs: row.latency_ms,
    sample: {
      tiles: row.tiles,
      tests: row.tests,
      devices: row.devices,
      strength: sampleStrengthOf(row.tests),
    },
    sourceId: row.source_id,
    vintage: quarterEnd(row.quarter_start),
    fetchedAt: row.fetched_at,
  };
}
