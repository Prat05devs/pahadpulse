import { err, ok, type Result } from 'neverthrow';

import { IMD_CAP } from '../../../config/constants.js';
import { AlertRepository } from '../../../repositories/alert.repository.js';
import { AreaRepository } from '../../../repositories/area.repository.js';
import { AreaType } from '../../../types/area.js';
import { toDateOnly, toMysqlUtcDatetime } from '../../../utils/datetime.js';
import type { RequestError } from '../../../utils/errors.js';
import { fetchText } from '../../../utils/http.js';
import createLogger from '../../../utils/logger.js';
import type { ConnectorContext, ConnectorOutcome, SourceConnector } from '../connector.js';
import {
  classifyAlertType,
  districtNameCandidates,
  isRelevantToUttarakhand,
  normalizeCertainty,
  normalizeSeverity,
  normalizeUrgency,
  parseCapAlert,
  parseCapIndex,
} from './imd-cap.parser.js';

const logger = createLogger('@imd-cap.connector');

type ItemOutcome =
  | { kind: 'written'; vintage: string | null }
  | { kind: 'cancelled' }
  | { kind: 'rejected' }
  | { kind: 'filtered' }
  | { kind: 'notUttarakhand' };

/**
 * IMD CAP alert feed — public, no key, no IP whitelist. Endpoint verified reachable and
 * returning real CAP 1.2 documents on 2026-09-03 (see the fixtures in
 * `src/__tests__/fixtures/` and `imd-cap.parser.ts`'s header comment).
 *
 * IMPORTANT — this connector fetches and stores real alerts, but the `imd-cap-alerts`
 * source is seeded with `may_redistribute = FALSE` (migration 005): IMD's redistribution
 * rights are unconfirmed (DS-6). That means every alert ingested here is correctly
 * EXCLUDED from the public API by `publiclyDisplayable()` until someone confirms those
 * rights in writing. This is not a bug — it is the documented consequence of DS-6, and
 * flipping the flag is a registry decision, not a code change. See alerts.md §9.
 *
 * Two-stage fetch: the RSS index lists items with only a link and guid; each item's link
 * points to the actual signed CAP document, which is where severity, area and expiry live.
 */
class ImdCapConnector implements SourceConnector {
  readonly sourceKey = 'imd-cap-alerts';
  readonly ownerModule = 'alerts';
  readonly isAvailable = true;
  readonly unavailableReason = null;

  async fetch(context: ConnectorContext): Promise<Result<ConnectorOutcome, RequestError>> {
    const indexText = await fetchText(IMD_CAP.INDEX_URL, {
      timeoutMs: IMD_CAP.FETCH_TIMEOUT_MS,
      retries: IMD_CAP.FETCH_RETRIES,
    });
    if (indexText.isErr()) return err(indexText.error);

    const items = parseCapIndex(indexText.value);
    if (items.isErr()) return err(items.error);

    const uttarakhand = await AreaRepository.findByCode(AreaType.State, 'UK');
    if (uttarakhand.isErr()) return err(uttarakhand.error);
    const stateAreaId = uttarakhand.value.id;

    let written = 0;
    let rejected = 0;
    let skippedNotUttarakhand = 0;
    let latestVintage: string | null = null;

    for (const item of items.value.slice(0, IMD_CAP.MAX_ITEMS_PER_RUN)) {
      // Sequential by design: this is a small, bounded feed, and fetching every item in
      // parallel would just hammer the same S3 bucket at once for no real gain.
      const outcome = await this.processItem(item.link, stateAreaId, context);

      switch (outcome.kind) {
        case 'written':
          written += 1;
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
        case 'notUttarakhand':
          skippedNotUttarakhand += 1;
          break;
        case 'filtered':
          break;
      }
    }

    return ok({
      rowsWritten: written,
      rowsRejected: rejected,
      vintage: latestVintage,
      notes: `Processed ${items.value.length} feed item(s) (capped at ${IMD_CAP.MAX_ITEMS_PER_RUN}); ${written} written, ${rejected} rejected, ${skippedNotUttarakhand} not relevant to Uttarakhand.`,
    });
  }

  private async processItem(
    link: string,
    stateAreaId: number,
    context: ConnectorContext,
  ): Promise<ItemOutcome> {
    const docText = await fetchText(link, {
      timeoutMs: IMD_CAP.FETCH_TIMEOUT_MS,
      retries: IMD_CAP.FETCH_RETRIES,
    });
    if (docText.isErr()) {
      logger.warn('failed to fetch a CAP item', { link, code: docText.error.code });
      return { kind: 'rejected' };
    }

    const parsed = parseCapAlert(docText.value);
    if (parsed.isErr()) {
      logger.warn('failed to parse a CAP item', { link, code: parsed.error.code });
      return { kind: 'rejected' };
    }
    const alert = parsed.value;

    // Never ingest a Test/Exercise/Draft/System message as if it were real, and never a
    // non-Public scope — this is a public transparency platform, not a restricted channel.
    if (alert.status !== 'Actual' || alert.scope !== 'Public') {
      return { kind: 'filtered' };
    }

    const areaDescs = alert.areas.map((a) => a.areaDesc);
    if (!isRelevantToUttarakhand(areaDescs)) return { kind: 'notUttarakhand' };

    if (alert.msgType === 'Cancel') {
      const cancelled = await AlertRepository.cancel(context.sourceId, alert.identifier);
      return cancelled.isErr() ? { kind: 'rejected' } : { kind: 'cancelled' };
    }

    const districts = await AreaRepository.resolveToDistricts(districtNameCandidates(areaDescs));
    if (districts.isErr()) return { kind: 'rejected' };

    // The state-level match from isRelevantToUttarakhand always resolves — 'UK' is seeded
    // reference data (geography.md). Any specific district names found are added too.
    const areaIds = new Set<number>([stateAreaId, ...districts.value.map((d) => d.id)]);

    const issuedAt = toMysqlUtcDatetime(alert.sent);
    if (issuedAt === null) {
      logger.warn('CAP alert had an unparseable sent timestamp', {
        identifier: alert.identifier,
        sent: alert.sent,
      });
      return { kind: 'rejected' };
    }

    const upserted = await AlertRepository.upsert({
      sourceId: context.sourceId,
      sourceAlertId: alert.identifier,
      type: classifyAlertType(alert.event, alert.headline, alert.description),
      severity: normalizeSeverity(alert.severity),
      urgency: normalizeUrgency(alert.urgency),
      certainty: normalizeCertainty(alert.certainty),
      headline: alert.headline,
      body: alert.description,
      instruction: alert.instruction,
      language: alert.language,
      authority: alert.senderName,
      webUrl: alert.web,
      issuedAt,
      effectiveFrom: toMysqlUtcDatetime(alert.onset),
      expiresAt: toMysqlUtcDatetime(alert.expires),
      areaIds: [...areaIds],
    });
    if (upserted.isErr()) return { kind: 'rejected' };

    return { kind: 'written', vintage: toDateOnly(alert.sent) };
  }
}

export const imdCapConnector: SourceConnector = new ImdCapConnector();
