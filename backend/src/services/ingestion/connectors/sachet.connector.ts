import { err, ok, type Result } from 'neverthrow';

import { ALERT_SIMPLIFY_TOLERANCE_DEGREES, SACHET } from '../../../config/constants.js';
import { AlertRepository } from '../../../repositories/alert.repository.js';
import { AreaRepository } from '../../../repositories/area.repository.js';
import { AreaType } from '../../../types/area.js';
import { toDateOnly, toMysqlUtcDatetime } from '../../../utils/datetime.js';
import type { RequestError } from '../../../utils/errors.js';
import {
  countPositions,
  geometryCentroid,
  simplifyGeometry,
  type Geometry,
} from '../../../utils/geojson.js';
import { fetchText } from '../../../utils/http.js';
import createLogger from '../../../utils/logger.js';
import type { ConnectorContext, ConnectorOutcome, SourceConnector } from '../connector.js';
import {
  classifyAlertType,
  normalizeCertainty,
  normalizeSeverity,
  normalizeUrgency,
} from './imd-cap.parser.js';
import {
  findDistrictsInText,
  parseSachetAlert,
  parseSachetIndex,
  parseSachetPolygons,
  selectInfo,
  type DistrictNameCandidate,
} from './sachet.parser.js';

const logger = createLogger('@sachet.connector');

type ItemOutcome =
  | { kind: 'written'; vintage: string | null; hadGeometry: boolean }
  | { kind: 'cancelled' }
  | { kind: 'rejected' }
  | { kind: 'filtered' };

/**
 * SACHET (NDMA) — the national CAP alert aggregator, read through its per-state feed.
 *
 * Public, no key, no IP whitelist. Verified end-to-end 2026-09-04; see migration 011 for why
 * this source exists alongside `imd-cap-alerts` and why it is the one alert source seeded
 * `may_redistribute = TRUE`.
 *
 * Three-stage fetch per alert, which is one more stage than the IMD connector:
 *
 *   1. the state RSS index      → identifiers
 *   2. `FetchXMLFile`           → the CAP 1.2 document (severity, timing, headline)
 *   3. `FetchPolygonXMLFile`    → the affected-area geometry, in a separate document
 *
 * Stage 3 is best-effort by design. Geometry failing must never cost us the alert: a
 * thunderstorm warning with no polygon still belongs on the list and in the count. It is
 * fetched second so that a slow or broken polygon endpoint degrades the map, not the alert.
 */
class SachetConnector implements SourceConnector {
  readonly sourceKey = 'sachet-ndma';
  readonly ownerModule = 'alerts';
  readonly isAvailable = true;
  readonly unavailableReason = null;

  async fetch(context: ConnectorContext): Promise<Result<ConnectorOutcome, RequestError>> {
    const indexText = await fetchText(SACHET.STATE_FEED_URL, {
      timeoutMs: SACHET.FETCH_TIMEOUT_MS,
      retries: SACHET.FETCH_RETRIES,
    });
    if (indexText.isErr()) return err(indexText.error);

    const items = parseSachetIndex(indexText.value);
    if (items.isErr()) return err(items.error);

    const uttarakhand = await AreaRepository.findByCode(AreaType.State, 'UK');
    if (uttarakhand.isErr()) return err(uttarakhand.error);

    // Fetched once per run rather than once per alert: 13 rows of reference data used by
    // every item's district resolution.
    const districtNames = await AreaRepository.listDistrictNames();
    if (districtNames.isErr()) return err(districtNames.error);

    let written = 0;
    let rejected = 0;
    let filtered = 0;
    let withGeometry = 0;
    let latestVintage: string | null = null;

    for (const item of items.value.slice(0, SACHET.MAX_ITEMS_PER_RUN)) {
      // Sequential for the same reason as the IMD connector: a small bounded feed, and
      // three requests per item in parallel would hammer one government host.
      const outcome = await this.processItem(
        item.identifier,
        uttarakhand.value.id,
        districtNames.value,
        context,
      );

      switch (outcome.kind) {
        case 'written':
          written += 1;
          if (outcome.hadGeometry) withGeometry += 1;
          if (
            outcome.vintage !== null &&
            (latestVintage === null || outcome.vintage > latestVintage)
          ) {
            latestVintage = outcome.vintage;
          }
          break;
        case 'cancelled':
          written += 1;
          break;
        case 'rejected':
          rejected += 1;
          break;
        case 'filtered':
          filtered += 1;
          break;
      }
    }

    return ok({
      rowsWritten: written,
      rowsRejected: rejected,
      vintage: latestVintage,
      notes:
        `Processed ${items.value.length} feed item(s) (capped at ${SACHET.MAX_ITEMS_PER_RUN}); ` +
        `${written} written (${withGeometry} with geometry), ${rejected} rejected, ${filtered} filtered.`,
    });
  }

  private async processItem(
    identifier: string,
    stateAreaId: number,
    districts: readonly DistrictNameCandidate[],
    context: ConnectorContext,
  ): Promise<ItemOutcome> {
    const docText = await fetchText(`${SACHET.ALERT_URL}${encodeURIComponent(identifier)}`, {
      timeoutMs: SACHET.FETCH_TIMEOUT_MS,
      retries: SACHET.FETCH_RETRIES,
    });
    if (docText.isErr()) {
      logger.warn('failed to fetch a SACHET alert', { identifier, code: docText.error.code });
      return { kind: 'rejected' };
    }

    const parsed = parseSachetAlert(docText.value);
    if (parsed.isErr()) {
      logger.warn('failed to parse a SACHET alert', { identifier, code: parsed.error.code });
      return { kind: 'rejected' };
    }
    const alert = parsed.value;

    // Never ingest a Test/Exercise/Draft message as if it were real, and never a non-Public
    // scope — same rule as the IMD connector, for the same reason.
    if (alert.status !== 'Actual' || alert.scope !== 'Public') {
      return { kind: 'filtered' };
    }

    if (alert.msgType === 'Cancel') {
      const cancelled = await AlertRepository.cancel(context.sourceId, alert.identifier);
      return cancelled.isErr() ? { kind: 'rejected' } : { kind: 'cancelled' };
    }

    const info = selectInfo(alert.infos);
    if (info === null) return { kind: 'rejected' };

    const issuedAt = toMysqlUtcDatetime(alert.sent);
    if (issuedAt === null) {
      logger.warn('SACHET alert had an unparseable sent timestamp', {
        identifier: alert.identifier,
        sent: alert.sent,
      });
      return { kind: 'rejected' };
    }

    // Districts are read out of the headline, not areaDesc — see sachet.parser.ts note (3).
    // Every alert in this feed is state-scoped by definition (it came from the Uttarakhand
    // feed), so the state area is always attached and named districts are added to it. An
    // alert we cannot pin to a district is still a state-level alert, never a dropped one.
    const matchedDistricts = findDistrictsInText(
      `${info.headline} ${info.areaDesc} ${info.event}`,
      districts,
    );
    const areaIds = [...new Set<number>([stateAreaId, ...matchedDistricts])];

    const geometry = await this.fetchGeometry(identifier);
    const centroid = geometry === null ? null : geometryCentroid(geometry);

    const upserted = await AlertRepository.upsert({
      sourceId: context.sourceId,
      sourceAlertId: alert.identifier,
      type: classifyAlertType(info.event, info.headline, info.description),
      severity: normalizeSeverity(info.severity),
      urgency: normalizeUrgency(info.urgency),
      certainty: normalizeCertainty(info.certainty),
      headline: info.headline,
      body: info.description,
      instruction: info.instruction,
      language: info.language,
      authority: alert.sender,
      webUrl: `${SACHET.ALERT_URL}${encodeURIComponent(identifier)}`,
      issuedAt,
      effectiveFrom: toMysqlUtcDatetime(info.onset ?? info.effective),
      expiresAt: toMysqlUtcDatetime(info.expires),
      areaIds,
      geometry,
      centroidLat: centroid === null ? null : centroid[1],
      centroidLng: centroid === null ? null : centroid[0],
    });
    if (upserted.isErr()) return { kind: 'rejected' };

    return {
      kind: 'written',
      vintage: toDateOnly(alert.sent),
      hadGeometry: geometry !== null,
    };
  }

  /**
   * Best-effort geometry. Every failure path returns null rather than propagating, because
   * an alert without a polygon is a complete alert — see the class note.
   *
   * Simplified before storage, not on read: the raw rings run to ~4,000 points each and the
   * map is the only consumer, so paying for the reduction once per ingestion beats paying
   * for it on every request (GEO-5).
   */
  private async fetchGeometry(identifier: string): Promise<Geometry | null> {
    const polygonText = await fetchText(`${SACHET.POLYGON_URL}${encodeURIComponent(identifier)}`, {
      timeoutMs: SACHET.FETCH_TIMEOUT_MS,
      retries: SACHET.FETCH_RETRIES,
    });
    if (polygonText.isErr()) {
      logger.warn('failed to fetch SACHET geometry; storing the alert without it', {
        identifier,
        code: polygonText.error.code,
      });
      return null;
    }

    const parsed = parseSachetPolygons(polygonText.value);
    if (parsed.isErr()) {
      logger.warn('failed to parse SACHET geometry; storing the alert without it', { identifier });
      return null;
    }
    if (parsed.value === null) return null;

    const simplified = simplifyGeometry(parsed.value, ALERT_SIMPLIFY_TOLERANCE_DEGREES);
    logger.debug('simplified alert geometry', {
      identifier,
      before: countPositions(parsed.value),
      after: countPositions(simplified),
    });
    return simplified;
  }
}

export const sachetConnector: SourceConnector = new SachetConnector();
