/**
 * `datasets` domain enums.
 *
 * Values must match the MySQL ENUMs in `004-create-sources.sql` character for character.
 */

/** How data physically reaches us from a source. */
export enum AccessMethod {
  Api = 'api',
  Feed = 'feed',
  Bulk = 'bulk',
  /**
   * Deliberate: THDC and UJVNL publish PDFs, and a human entering a weekly reservoir
   * figure is a legitimate ingestion method carrying the same provenance as an API.
   */
  Manual = 'manual',
}

/** How often a source is expected to change. Drives freshness (DS-3). */
export enum Cadence {
  Realtime = 'realtime',
  Hourly = 'hourly',
  Daily = 'daily',
  Monthly = 'monthly',
  Quarterly = 'quarterly',
  Annual = 'annual',
  Static = 'static',
}

export enum RunStatus {
  Running = 'running',
  Succeeded = 'succeeded',
  Failed = 'failed',
  PartialSuccess = 'partial_success',
}

/** Computed, never stored (DS-3). */
export enum Freshness {
  Fresh = 'fresh',
  Stale = 'stale',
  Expired = 'expired',
  /** No successful run yet — distinct from "old". */
  Unknown = 'unknown',
}

/**
 * Whether a source's registry metadata has been confirmed with the publishing body.
 * Everything seeded before a departmental conversation is `provisional`.
 */
export enum MetadataStatus {
  Provisional = 'provisional',
  Verified = 'verified',
}
