import { err, ok, type Result } from 'neverthrow';

import { OVERPASS } from '../../../config/constants.js';
import { RoadRepository, type UpsertRoadRouteInput } from '../../../repositories/road.repository.js';
import { toDateOnly } from '../../../utils/datetime.js';
import { ERRORS, type RequestError } from '../../../utils/errors.js';
import { fetchText } from '../../../utils/http.js';
import createLogger from '../../../utils/logger.js';
import type { ConnectorContext, ConnectorOutcome, SourceConnector } from '../connector.js';
import { collectRoadRefs, parseRoadRefs } from './osm-roads.parser.js';

const logger = createLogger('@osm-roads.connector');

/**
 * OpenStreetMap — the National and State Highways running through Uttarakhand.
 *
 * Owned by `roads`, under its own source key. `openstreetmap` belongs to `geography` for
 * boundaries; one source key has exactly one owning module (DS-7), so this is a second
 * registration of the same upstream rather than a shared row.
 *
 * WHAT THIS IS NOT: a road status feed. It answers "which highways are here", never "is this
 * road open". Closures are manually reported and have no upstream feed at all (roads.md), so
 * nothing here may be presented as a live road condition.
 *
 * Crowd-sourced, and the registry says so: this is what mappers have tagged, not an NHAI or
 * PWD register. Verified 2026-09-05 against a live extract of 2,981 tagged ways, which
 * yielded 26 National and 29 State Highway references after normalisation.
 */
class OsmRoadsConnector implements SourceConnector {
  readonly sourceKey = 'openstreetmap-roads';
  readonly ownerModule = 'roads';
  readonly isAvailable = true;
  readonly unavailableReason = null;

  async fetch(context: ConnectorContext): Promise<Result<ConnectorOutcome, RequestError>> {
    const body = await this.fetchFromAnyMirror();
    if (body.isErr()) return err(body.error);

    const roads = collectRoadRefs(body.value);
    if (roads.isErr()) return err(roads.error);

    // Segment counts and extents in one pass over the extract.
    const stats = this.collectStats(body.value);

    // OSM is continuously edited and publishes no vintage of its own. For a live database
    // the date the data describes IS the date it was read (DS-2 forbids inventing one).
    const vintage = toDateOnly(context.now.toISOString()) ?? context.now.toISOString().slice(0, 10);

    const routes: UpsertRoadRouteInput[] = roads.value.map((road) => ({
      ref: road.ref,
      network: road.network,
      routeNumber: road.number,
      segmentCount: stats.get(road.ref)?.count ?? 0,
      bounds: stats.get(road.ref)?.bounds ?? null,
      sourceId: context.sourceId,
      vintage,
    }));

    const written = await RoadRepository.replaceRoutes(context.sourceId, routes);
    if (written.isErr()) return err(written.error);

    const nationalCount = routes.filter((route) => route.network === 'NH').length;
    const stateCount = routes.length - nationalCount;

    logger.info('highway network ingested', { nationalCount, stateCount });

    return ok({
      rowsWritten: written.value,
      rowsRejected: 0,
      vintage,
      notes: `${nationalCount} National Highway(s) and ${stateCount} State Highway(s) tagged within Uttarakhand.`,
    });
  }

  /**
   * Per-highway segment count and extent, in one pass.
   *
   * The extent is the union of every way's own bounding box, so it covers the whole route
   * within the state rather than one arbitrary stretch — which is what makes "zoom to this
   * highway" land on the right place for a route that crosses the state.
   */
  private collectStats(
    body: string
  ): Map<string, { count: number; bounds: [number, number, number, number] | null }> {
    const stats = new Map<
      string,
      { count: number; bounds: [number, number, number, number] | null }
    >();

    let parsed: { elements?: unknown };
    try {
      parsed = JSON.parse(body) as { elements?: unknown };
    } catch {
      return stats;
    }
    if (!Array.isArray(parsed.elements)) return stats;

    type Bounds = { minlat?: unknown; minlon?: unknown; maxlat?: unknown; maxlon?: unknown };
    const elements = parsed.elements as { tags?: { ref?: unknown }; bounds?: Bounds }[];

    for (const element of elements) {
      const ref = element.tags?.ref;
      if (typeof ref !== 'string') continue;

      const b = element.bounds;
      const box =
        typeof b?.minlat === 'number' &&
        typeof b.minlon === 'number' &&
        typeof b.maxlat === 'number' &&
        typeof b.maxlon === 'number'
          ? ([b.minlon, b.minlat, b.maxlon, b.maxlat] as [number, number, number, number])
          : null;

      for (const road of parseRoadRefs(ref)) {
        const current = stats.get(road.ref) ?? { count: 0, bounds: null };
        current.count += 1;
        if (box !== null) {
          current.bounds =
            current.bounds === null
              ? [...box]
              : [
                  Math.min(current.bounds[0], box[0]),
                  Math.min(current.bounds[1], box[1]),
                  Math.max(current.bounds[2], box[2]),
                  Math.max(current.bounds[3], box[3]),
                ];
        }
        stats.set(road.ref, current);
      }
    }

    return stats;
  }

  /**
   * Same mirror-failover reasoning as the boundary connector: these are volunteer-run and a
   * busy one answers HTTP 200 with an HTML error page, so the parse is the real detector.
   */
  private async fetchFromAnyMirror(): Promise<Result<string, RequestError>> {
    const query = [
      '[out:json][timeout:200];',
      `area(${3600000000 + OVERPASS.STATE_RELATION_ID})->.uk;`,
      'way["highway"~"^(motorway|trunk|primary|secondary)$"]["ref"](area.uk);',
      // `out tags bb` — tags plus each way's bounding box, NOT `out geom`. The extent is
      // all the map needs to frame a highway, and full geometry would be many times the
      // payload to draw a line the basemap already has.
      'out tags bb;',
    ].join('\n');

    let lastError: RequestError = ERRORS.UPSTREAM_UNAVAILABLE;

    for (const mirror of OVERPASS.MIRRORS) {
      const response = await fetchText(`${mirror}?data=${encodeURIComponent(query)}`, {
        timeoutMs: OVERPASS.FETCH_TIMEOUT_MS,
        retries: OVERPASS.FETCH_RETRIES,
        headers: { 'User-Agent': OVERPASS.USER_AGENT },
      });

      if (response.isErr()) {
        lastError = response.error;
        logger.warn('Overpass mirror failed', { mirror, code: response.error.code });
        continue;
      }

      if (collectRoadRefs(response.value).isErr()) {
        lastError = ERRORS.UPSTREAM_RESPONSE_INVALID;
        logger.warn('Overpass mirror answered but not with usable JSON (probably busy)', {
          mirror,
        });
        continue;
      }

      logger.info('Overpass mirror answered', { mirror });
      return ok(response.value);
    }

    return err(lastError);
  }
}

export const osmRoadsConnector: SourceConnector = new OsmRoadsConnector();
