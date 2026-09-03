import { err, ok, type Result } from 'neverthrow';

import type { Provenance, Source } from '../models/source.model.js';
import { SourceRepository } from '../repositories/source.repository.js';
import { Freshness } from '../types/dataset.js';
import type { RequestError } from '../utils/errors.js';
import { freshnessOf } from '../utils/freshness.js';

/** The minimum a domain row must carry to be displayable (DS-1). */
export interface HasProvenance {
  sourceId: number;
  vintage: string;
  fetchedAt: string;
}

function parseUtc(value: string): Date | null {
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toProvenance(source: Source, item: HasProvenance, now: Date): Provenance {
  return {
    sourceKey: source.key,
    department: source.department,
    url: source.url,
    attribution: source.attribution,
    // The value's OWN vintage and fetch time, not the source's latest run: a district may
    // hold a 2011 figure while the source has newer data for other districts (DS-2).
    vintage: item.vintage,
    fetchedAt: item.fetchedAt,
    freshness: freshnessOf(source.cadence, parseUtc(item.fetchedAt), now),
    mayRedistribute: source.mayRedistribute,
  };
}

/**
 * Attaches a provenance stamp to a page of domain values.
 *
 * One query for the whole page, then an in-memory join — the alternative is an N+1 on
 * every dashboard, since a single district page renders values from six or more sources.
 *
 * Values whose source is missing from the registry are returned with `provenance: null`.
 * Callers must drop those rather than display them: a value that cannot name its source
 * is not displayed (DS-1).
 */
export async function attachProvenance<T extends HasProvenance>(
  items: readonly T[],
  now: Date = new Date(),
): Promise<Result<(T & { provenance: Provenance | null })[], RequestError>> {
  if (items.length === 0) return ok([]);

  const ids = [...new Set(items.map((item) => item.sourceId))];
  const sources = await SourceRepository.findByIds(ids, now);
  if (sources.isErr()) return err(sources.error);

  return ok(
    items.map((item) => {
      const source = sources.value.get(item.sourceId);
      return {
        ...item,
        provenance: source === undefined ? null : toProvenance(source, item, now),
      };
    }),
  );
}

/**
 * Filters a page down to values that may actually be shown to the public (DS-6).
 * Access is not redistribution: a source we can call is not necessarily one we may republish.
 */
export function publiclyDisplayable<T extends { provenance: Provenance | null }>(
  items: readonly T[],
): T[] {
  return items.filter((item) => item.provenance !== null && item.provenance.mayRedistribute);
}

/** True when a value is stale enough that the UI must say so rather than imply currency. */
export function needsStalenessBadge(provenance: Provenance | null): boolean {
  return (
    provenance === null ||
    provenance.freshness === Freshness.Stale ||
    provenance.freshness === Freshness.Expired ||
    provenance.freshness === Freshness.Unknown
  );
}
