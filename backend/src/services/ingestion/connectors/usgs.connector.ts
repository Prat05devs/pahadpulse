import { err, ok, type Result } from 'neverthrow';

import { USGS } from '../../../config/constants.js';
import {
  SeismicRepository,
  type UpsertSeismicInput,
} from '../../../repositories/seismic.repository.js';
import type { RequestError } from '../../../utils/errors.js';
import { fetchText } from '../../../utils/http.js';
import createLogger from '../../../utils/logger.js';
import type { ConnectorContext, ConnectorOutcome, SourceConnector } from '../connector.js';
import { epochToMysqlUtc, parseUsgsResponse, readGeometry } from './usgs.parser.js';

const logger = createLogger('@usgs.connector');

/**
 * USGS earthquakes within the Uttarakhand bounding box.
 *
 * The bbox is applied by the UPSTREAM query, not by us after the fact — USGS supports
 * min/max latitude and longitude natively, so the feed arrives already scoped and a
 * national or global download never happens.
 *
 * The 90-day lookback re-reads settled events every run. That is deliberate rather than
 * wasteful: USGS revises magnitude and depth for hours after an event as more stations
 * report, and the upsert key means a revision corrects our row instead of adding a second
 * earthquake (DS-5).
 */
class UsgsConnector implements SourceConnector {
  readonly sourceKey = 'usgs-earthquakes';
  readonly ownerModule = 'seismic';
  readonly isAvailable = true;
  readonly unavailableReason = null;

  async fetch(context: ConnectorContext): Promise<Result<ConnectorOutcome, RequestError>> {
    const start = new Date(context.now.getTime() - USGS.LOOKBACK_DAYS * 86_400_000);

    const params = new URLSearchParams({
      format: 'geojson',
      starttime: start.toISOString().slice(0, 10),
      minlatitude: USGS.BBOX.MIN_LAT.toString(),
      maxlatitude: USGS.BBOX.MAX_LAT.toString(),
      minlongitude: USGS.BBOX.MIN_LNG.toString(),
      maxlongitude: USGS.BBOX.MAX_LNG.toString(),
      orderby: 'time',
    });
    if (USGS.MIN_MAGNITUDE !== null) {
      params.set('minmagnitude', String(USGS.MIN_MAGNITUDE));
    }

    const body = await fetchText(`${USGS.QUERY_URL}?${params.toString()}`, {
      timeoutMs: USGS.FETCH_TIMEOUT_MS,
      retries: USGS.FETCH_RETRIES,
    });
    if (body.isErr()) return err(body.error);

    const features = parseUsgsResponse(body.value);
    if (features.isErr()) return err(features.error);

    const rows: UpsertSeismicInput[] = [];
    let rejected = 0;
    let latestVintage: string | null = null;

    for (const feature of features.value.slice(0, USGS.MAX_ITEMS_PER_RUN)) {
      const properties = feature.properties;

      // A detection can exist before a magnitude is computed. Skipped rather than stored
      // as zero, which would render an unknown event as a harmless one.
      if (properties.mag === null) {
        rejected += 1;
        continue;
      }

      const geometry = readGeometry(feature);
      if (geometry === null) {
        rejected += 1;
        continue;
      }

      const occurredAt = epochToMysqlUtc(properties.time);
      if (occurredAt === null) {
        logger.warn('USGS event had an unparseable time', { id: feature.id });
        rejected += 1;
        continue;
      }

      rows.push({
        sourceId: context.sourceId,
        sourceEventId: feature.id,
        magnitude: properties.mag,
        magnitudeType: properties.magType ?? null,
        depthKm: geometry.depthKm,
        // USGS's own place string, verbatim. Not re-derived into our district names: that
        // would be us asserting a location the source did not state.
        place: properties.place ?? properties.title ?? 'Unknown location',
        lat: geometry.lat,
        lng: geometry.lng,
        occurredAt,
        reviewStatus: properties.status ?? null,
        webUrl: properties.url ?? null,
      });

      const day = occurredAt.slice(0, 10);
      if (latestVintage === null || day > latestVintage) latestVintage = day;
    }

    const stored = await SeismicRepository.upsertMany(rows);
    if (stored.isErr()) return err(stored.error);

    return ok({
      rowsWritten: stored.value,
      rowsRejected: rejected,
      // What the data describes: the most recent event in the window. Null when the window
      // held nothing, which is a real and common state — a quiet quarter is not a failure.
      vintage: latestVintage,
      notes:
        `${features.value.length} event(s) in the last ${USGS.LOOKBACK_DAYS} days within the ` +
        `state bounding box; ${stored.value} written, ${rejected} skipped.`,
    });
  }
}

export const usgsConnector: SourceConnector = new UsgsConnector();
