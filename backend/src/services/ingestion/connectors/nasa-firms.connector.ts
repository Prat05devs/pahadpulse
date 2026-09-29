import { err, ok, type Result } from 'neverthrow';

import { FIRMS } from '../../../config/constants.js';
import { env } from '../../../config/env.js';
import { FireRepository } from '../../../repositories/fire.repository.js';
import { ERRORS, type RequestError } from '../../../utils/errors.js';
import { fetchText } from '../../../utils/http.js';
import createLogger from '../../../utils/logger.js';
import type { ConnectorContext, ConnectorOutcome, SourceConnector } from '../connector.js';
import { parseFirmsCsv, type ParsedFireDetection } from './nasa-firms.parser.js';

const logger = createLogger('@nasa-firms.connector');

/** `…/api/area/csv/{key}/{product}/{west,south,east,north}/{days}`, as FIRMS documents it. */
export function firmsAreaUrl(mapKey: string, sensor: string): string {
  return [FIRMS.AREA_URL, encodeURIComponent(mapKey), sensor, FIRMS.BBOX, FIRMS.DAY_RANGE].join(
    '/',
  );
}

/**
 * NASA FIRMS active-fire detections over Uttarakhand.
 *
 * Each product is fetched separately. One product failing, which happens when a satellite
 * is in safe mode, does not throw away the others: the run is recorded as partial and names
 * the missing product. Only when every product fails is the run a failure.
 *
 * The map key goes in the URL path, which is FIRMS's design rather than ours, so it is
 * redacted from every log line `fetchText` writes.
 */
class NasaFirmsConnector implements SourceConnector {
  readonly sourceKey = 'nasa-firms';
  readonly ownerModule = 'wildfire';

  get isAvailable(): boolean {
    return env.FIRMS_MAP_KEY !== undefined;
  }

  get unavailableReason(): string | null {
    return this.isAvailable
      ? null
      : 'No FIRMS map key. Request one free at firms.modaps.eosdis.nasa.gov/api/map_key, then set FIRMS_MAP_KEY.';
  }

  async fetch(context: ConnectorContext): Promise<Result<ConnectorOutcome, RequestError>> {
    const mapKey = env.FIRMS_MAP_KEY;
    if (mapKey === undefined) return err(ERRORS.CONNECTOR_NOT_AVAILABLE);

    const detections: ParsedFireDetection[] = [];
    const failed: string[] = [];
    let rejected = 0;

    for (const sensor of FIRMS.SOURCES) {
      const body = await fetchText(firmsAreaUrl(mapKey, sensor), {
        timeoutMs: FIRMS.FETCH_TIMEOUT_MS,
        retries: FIRMS.FETCH_RETRIES,
        redact: [mapKey, encodeURIComponent(mapKey)],
      });
      const parsed = body.andThen((text) => parseFirmsCsv(text, sensor));
      if (parsed.isErr()) {
        logger.warn('FIRMS product unavailable this run', { sensor, code: parsed.error.code });
        failed.push(sensor);
        continue;
      }
      detections.push(...parsed.value.detections);
      rejected += parsed.value.rejected;
    }

    if (failed.length === FIRMS.SOURCES.length) return err(ERRORS.UPSTREAM_UNAVAILABLE);

    const stored = await FireRepository.upsertMany(context.sourceId, detections);
    if (stored.isErr()) return err(stored.error);

    const latest = detections.reduce<string | null>(
      (max, d) => (max === null || d.acquiredAt > max ? d.acquiredAt : max),
      null,
    );

    return ok({
      rowsWritten: stored.value,
      // A missing product counts as one rejection, so the run is recorded as partial.
      rowsRejected: rejected + failed.length,
      // The latest overpass seen. Null on a day with no fires, which is not a failure.
      vintage: latest === null ? null : latest.slice(0, 10),
      notes:
        `${detections.length} detection(s) in the bounding box over the last ` +
        `${FIRMS.DAY_RANGE} day(s); ${stored.value} inside a district and stored, ` +
        `${detections.length - stored.value} outside the state; ${rejected} malformed.` +
        (failed.length > 0 ? ` Unavailable this run: ${failed.join(', ')}.` : ''),
    });
  }
}

export const nasaFirmsConnector: SourceConnector = new NasaFirmsConnector();
