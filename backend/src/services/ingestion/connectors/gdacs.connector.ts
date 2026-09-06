import { err, ok, type Result } from 'neverthrow';

import { GDACS } from '../../../config/constants.js';
import { AlertRepository } from '../../../repositories/alert.repository.js';
import { AreaRepository } from '../../../repositories/area.repository.js';
import { AlertCertainty, AlertUrgency } from '../../../types/alert.js';
import { AreaType } from '../../../types/area.js';
import { toDateOnly, toMysqlUtcDatetime } from '../../../utils/datetime.js';
import type { RequestError } from '../../../utils/errors.js';
import createLogger from '../../../utils/logger.js';
import type { ConnectorContext, ConnectorOutcome, SourceConnector } from '../connector.js';
import {
  classifyGdacsEventType,
  gdacsTimestampToUtc,
  normalizeGdacsAlertLevel,
  parseGdacsResponse,
  pointCoordinates,
  type GdacsFeature,
} from './gdacs.parser.js';
import { fetchText } from '../../../utils/http.js';

const logger = createLogger('@gdacs.connector');

/**
 * GDACS — internationally assessed disaster events, filtered to Uttarakhand.
 *
 * Complements the CAP sources rather than duplicating them; see migration 022 for why an
 * event appearing in both SACHET and GDACS stays two rows rather than being merged.
 *
 * The whole feed is national. GDACS has no state-level query, so filtering happens here:
 * an event whose centroid falls outside the Uttarakhand bounding box is skipped before
 * anything is written. That is a coarse filter and deliberately so — a bounding box over
 * a mountain state will admit a few events just outside the border, and admitting a
 * neighbour's flood is a far cheaper error than dropping one of ours.
 */
class GdacsConnector implements SourceConnector {
  readonly sourceKey = 'gdacs';
  readonly ownerModule = 'alerts';
  readonly isAvailable = true;
  readonly unavailableReason = null;

  async fetch(context: ConnectorContext): Promise<Result<ConnectorOutcome, RequestError>> {
    const params = new URLSearchParams({
      country: GDACS.COUNTRY,
      eventlist: GDACS.EVENT_TYPES,
    });

    const body = await fetchText(`${GDACS.EVENT_LIST_URL}?${params.toString()}`, {
      timeoutMs: GDACS.FETCH_TIMEOUT_MS,
      retries: GDACS.FETCH_RETRIES,
    });
    if (body.isErr()) return err(body.error);

    const features = parseGdacsResponse(body.value);
    if (features.isErr()) return err(features.error);

    const uttarakhand = await AreaRepository.findByCode(AreaType.State, 'UK');
    if (uttarakhand.isErr()) return err(uttarakhand.error);

    let written = 0;
    let rejected = 0;
    let outsideState = 0;
    let latestVintage: string | null = null;

    for (const feature of features.value.slice(0, GDACS.MAX_ITEMS_PER_RUN)) {
      const coordinates = pointCoordinates(feature);
      if (coordinates === null || !this.isInUttarakhand(coordinates[1], coordinates[0])) {
        outsideState += 1;
        continue;
      }

      const outcome = await this.writeEvent(feature, coordinates, uttarakhand.value.id, context);
      if (outcome === null) {
        rejected += 1;
        continue;
      }

      written += 1;
      if (outcome !== '' && (latestVintage === null || outcome > latestVintage)) {
        latestVintage = outcome;
      }
    }

    return ok({
      rowsWritten: written,
      rowsRejected: rejected,
      vintage: latestVintage,
      notes:
        `Fetched ${features.value.length} national event(s); ` +
        `${outsideState} outside Uttarakhand, ${written} written, ${rejected} rejected.`,
    });
  }

  private isInUttarakhand(lat: number, lng: number): boolean {
    return (
      lat >= GDACS.BBOX.MIN_LAT &&
      lat <= GDACS.BBOX.MAX_LAT &&
      lng >= GDACS.BBOX.MIN_LNG &&
      lng <= GDACS.BBOX.MAX_LNG
    );
  }

  /** Returns the event's vintage on success, or null if it could not be written. */
  private async writeEvent(
    feature: GdacsFeature,
    coordinates: readonly [number, number],
    stateAreaId: number,
    context: ConnectorContext,
  ): Promise<string | null> {
    const properties = feature.properties;

    // Episodes are revisions of one event, so the episode id is deliberately NOT part of
    // the key: a new episode must replace our row rather than stack a second, contradictory
    // warning beside it (ALR-1).
    const sourceAlertId = `${properties.eventtype}:${String(properties.eventid)}`;

    // What GDACS last published about this event fills the `issued_at` role, exactly as
    // cap:sent does for the CAP sources (migration 008's header note). Falling back to the
    // event start is better than dropping an event that omits `datemodified`.
    const issuedIso =
      gdacsTimestampToUtc(properties.datemodified) ?? gdacsTimestampToUtc(properties.fromdate);
    const issuedAt = toMysqlUtcDatetime(issuedIso);
    if (issuedAt === null) {
      logger.warn('GDACS event had no usable timestamp', { sourceAlertId });
      return null;
    }

    const headline = properties.name ?? properties.description ?? 'GDACS disaster event';
    const body = properties.htmldescription ?? properties.description ?? headline;

    const upserted = await AlertRepository.upsert({
      sourceId: context.sourceId,
      sourceAlertId,
      type: classifyGdacsEventType(properties.eventtype),
      severity: normalizeGdacsAlertLevel(properties.alertlevel),
      // GDACS states neither. Recorded as unknown rather than inferred from the alert
      // level: urgency and certainty are separate CAP dimensions, and deriving them from
      // severity would manufacture agreement between fields the source never linked.
      urgency: AlertUrgency.Unknown,
      certainty: AlertCertainty.Unknown,
      headline,
      body,
      instruction: null,
      language: 'en',
      authority:
        properties.source === undefined || properties.source.length === 0
          ? 'GDACS (JRC / UN)'
          : `GDACS (JRC / UN) — ${properties.source}`,
      webUrl: properties.url?.report ?? null,
      issuedAt,
      effectiveFrom: toMysqlUtcDatetime(gdacsTimestampToUtc(properties.fromdate)),
      // GDACS's `todate` is when the event window closes. Left null when absent rather
      // than given an invented expiry (ALR-3).
      expiresAt: toMysqlUtcDatetime(gdacsTimestampToUtc(properties.todate)),
      // State-level only. GDACS locates an event by a single centroid, which is not enough
      // to claim which districts are affected — and naming the wrong district on a flood
      // alert is precisely the error this module exists to avoid (ALR-6).
      areaIds: [stateAreaId],
      // The events endpoint returns a Point; the alerts geometry column holds display
      // polygons. The centroid is stored, and the polygon endpoint is left for when the
      // map actually renders these.
      geometry: null,
      centroidLat: coordinates[1],
      centroidLng: coordinates[0],
    });

    if (upserted.isErr()) {
      logger.warn('failed to write a GDACS event', { sourceAlertId, code: upserted.error.code });
      return null;
    }

    return toDateOnly(issuedIso) ?? '';
  }
}

export const gdacsConnector: SourceConnector = new GdacsConnector();
