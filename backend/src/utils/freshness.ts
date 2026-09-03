import { CADENCE_INTERVAL_SECONDS, FRESHNESS_GRACE } from '../config/constants.js';
import { Cadence, Freshness } from '../types/dataset.js';

/**
 * The single definition of stale (DS-3).
 *
 * Freshness is COMPUTED, never stored. Storing it guarantees it goes wrong: the row would
 * have to be rewritten on a schedule to stay true, and any missed sweep would leave a stale
 * value labelled fresh — the one failure this module exists to prevent.
 *
 * Measured against `fetchedAt` (when we last successfully retrieved) rather than `vintage`
 * (what the data describes). A 2011 census figure fetched an hour ago is FRESH: our copy is
 * current. Its age is communicated by the vintage shown beside it, not by this function.
 */
export function freshnessOf(
  cadence: Cadence,
  fetchedAt: Date | null,
  now: Date = new Date(),
): Freshness {
  // No successful run yet. Distinct from "old" — we have never had this data at all.
  if (fetchedAt === null) return Freshness.Unknown;

  const interval = CADENCE_INTERVAL_SECONDS[cadence];
  if (!Number.isFinite(interval)) return Freshness.Fresh; // `static` never goes stale

  const ageSeconds = (now.getTime() - fetchedAt.getTime()) / 1000;

  // A clock skew or a future timestamp is not staleness.
  if (ageSeconds <= interval * FRESHNESS_GRACE.STALE_AFTER) return Freshness.Fresh;
  if (ageSeconds <= interval * FRESHNESS_GRACE.EXPIRED_AFTER) return Freshness.Stale;
  return Freshness.Expired;
}

/** Seconds until this source is expected to update again; null when it never will. */
export function secondsUntilStale(
  cadence: Cadence,
  fetchedAt: Date | null,
  now: Date = new Date(),
): number | null {
  if (fetchedAt === null) return null;
  const interval = CADENCE_INTERVAL_SECONDS[cadence];
  if (!Number.isFinite(interval)) return null;

  const ageSeconds = (now.getTime() - fetchedAt.getTime()) / 1000;
  return Math.max(0, Math.round(interval * FRESHNESS_GRACE.STALE_AFTER - ageSeconds));
}

/** True when this source's data may be shown to the public (DS-6). */
export function isPubliclyDisplayable(mayRedistribute: boolean): boolean {
  return mayRedistribute;
}

export { Cadence, Freshness };
