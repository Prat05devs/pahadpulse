import { err, ok, type Result } from 'neverthrow';

import type { SeismicEvent } from '../models/seismic.model.js';
import { SeismicRepository } from '../repositories/seismic.repository.js';
import { SourceRepository } from '../repositories/source.repository.js';
import { ERRORS, type RequestError } from '../utils/errors.js';

export interface RecentSeismic {
  events: SeismicEvent[];
  /** Events in the last 30 days — the headline the page leads with. */
  countLast30Days: number;
  largest: SeismicEvent | null;
  source: {
    key: string;
    department: { en: string; hi: string };
    attribution: string;
    url: string;
  } | null;
}

/**
 * Recent seismic activity in Uttarakhand.
 *
 * These are OBSERVED EVENTS, not warnings. Nothing here is presented as a forecast or an
 * instruction, and no earthquake prediction is implied — earthquakes are not predictable,
 * and a page that implied otherwise would be actively harmful in a state where people make
 * real decisions about where to sleep after a tremor.
 */
export async function getRecentSeismic(
  limit = 20,
  minMagnitude?: number,
  now: Date = new Date(),
): Promise<Result<RecentSeismic, RequestError>> {
  const events = await SeismicRepository.listRecent(limit, minMagnitude);
  if (events.isErr()) return err(events.error);

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000)
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d+Z$/, '');

  const count = await SeismicRepository.countSince(thirtyDaysAgo);
  if (count.isErr()) return err(count.error);

  // Largest within what was returned, and labelled that way in the UI rather than as an
  // all-time maximum — the list is capped, so this is the largest RECENT event.
  const largest = events.value.reduce<SeismicEvent | null>(
    (max, event) => (max === null || event.magnitude > max.magnitude ? event : max),
    null,
  );

  const sourceId = events.value[0]?.sourceId;
  let source: RecentSeismic['source'] = null;

  if (sourceId !== undefined) {
    const sources = await SourceRepository.findByIds([sourceId], now);
    if (sources.isErr()) return err(sources.error);

    const found = sources.value.get(sourceId);
    // DS-6 is enforced here, not in the UI: a source we may not republish emits nothing.
    if (found !== undefined) {
      if (!found.mayRedistribute) return err(ERRORS.SOURCE_NOT_REDISTRIBUTABLE);
      source = {
        key: found.key,
        department: found.department,
        attribution: found.attribution,
        url: found.url,
      };
    }
  }

  return ok({ events: events.value, countLast30Days: count.value, largest, source });
}
