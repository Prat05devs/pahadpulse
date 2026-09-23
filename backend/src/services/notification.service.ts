import { err, ok, type Result } from 'neverthrow';

import { PUSH } from '../config/constants.js';
import { env } from '../config/env.js';
import type { DeviceTokenRow, PendingAlertRow } from '../models/device.model.js';
import { DeviceRepository } from '../repositories/device.repository.js';
import { describeError } from '../utils/describe-error.js';
import type { RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';

const logger = createLogger('@notifications');

/**
 * Announcing a new warning to the devices that asked to be told.
 *
 * WHAT THIS IS NOT. It is not an emergency alerting system. The state's own channels —
 * SACHET, IMD, the district administration — are authoritative and reach people this app
 * has never heard of. A phone with notifications switched off, out of coverage, or asleep on
 * a free-tier server's watch will miss one, and the wording says so rather than implying a
 * guarantee this cannot make.
 *
 * DS-6 is enforced in the query, not here: a warning from a source we may not redistribute
 * never reaches this file.
 */

export interface DispatchReport {
  alerts: number;
  delivered: number;
  tokensDisabled: number;
  settled: number;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

/** Expo replies with one ticket per message, in the order they were sent. */
interface ExpoResponse {
  data?: ExpoTicket[];
  errors?: { message: string }[];
}

const UNKNOWN_LABEL = { en: 'Public alert', hi: 'सार्वजनिक चेतावनी' } as const;

const SEVERITY_LABEL: Record<string, { en: string; hi: string }> = {
  extreme: { en: 'Extreme warning', hi: 'अत्यधिक चेतावनी' },
  severe: { en: 'Severe warning', hi: 'गंभीर चेतावनी' },
  moderate: { en: 'Weather warning', hi: 'मौसम चेतावनी' },
  minor: { en: 'Weather advisory', hi: 'मौसम सूचना' },
  unknown: UNKNOWN_LABEL,
};

/**
 * The title names the severity and where; the body is the authority's own headline, never
 * a rewrite of it (ALR-2). A notification a reader cannot trace back to a published warning
 * is worse than none.
 */
export function buildMessage(
  alert: PendingAlertRow,
  language: 'en' | 'hi',
): { title: string; body: string } {
  const label = (SEVERITY_LABEL[alert.severity] ?? UNKNOWN_LABEL)[language];
  const areas = alert.area_names ?? [];
  const where =
    areas.length === 0
      ? language === 'hi'
        ? 'उत्तराखंड'
        : 'Uttarakhand'
      : areas.length <= 2
        ? areas.join(', ')
        : `${areas.slice(0, 2).join(', ')} +${areas.length - 2}`;

  return { title: `${label} · ${where}`, body: alert.headline };
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Sends one batch to Expo and reports which tokens it rejected as dead.
 *
 * A transport failure is logged and treated as "nothing delivered, no tokens dead": the
 * alert stays unannounced and the next tick tries again, which is the safe direction for a
 * warning. A `DeviceNotRegistered` ticket is the opposite — that token will never work
 * again, so it is retired.
 */
async function sendBatch(
  messages: { to: string; title: string; body: string; data: Record<string, unknown> }[],
): Promise<{ delivered: number; deadTokens: string[] }> {
  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
  };
  if (env.EXPO_ACCESS_TOKEN !== undefined) {
    headers.authorization = `Bearer ${env.EXPO_ACCESS_TOKEN}`;
  }

  let response: Response;
  try {
    response = await fetch(PUSH.EXPO_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(PUSH.TIMEOUT_MS),
    });
  } catch (error) {
    logger.warn('push transport failed', { error: describeError(error) });
    return { delivered: 0, deadTokens: [] };
  }

  if (!response.ok) {
    logger.warn('push rejected', { status: response.status });
    return { delivered: 0, deadTokens: [] };
  }

  let payload: ExpoResponse;
  try {
    payload = (await response.json()) as ExpoResponse;
  } catch (error) {
    logger.warn('push response was not JSON', { error: describeError(error) });
    return { delivered: 0, deadTokens: [] };
  }

  const tickets = payload.data ?? [];
  const deadTokens: string[] = [];
  let delivered = 0;

  tickets.forEach((ticket, index) => {
    if (ticket.status === 'ok') {
      delivered += 1;
      return;
    }
    const token = messages[index]?.to;
    if (ticket.details?.error === 'DeviceNotRegistered' && token !== undefined) {
      deadTokens.push(token);
      return;
    }
    logger.warn('push ticket failed', { error: ticket.details?.error, message: ticket.message });
  });

  return { delivered, deadTokens };
}

/**
 * One pass: find warnings nobody has been told about, tell everyone, record that they were
 * told.
 *
 * Marked as announced whether or not delivery succeeded for every device. The alternative —
 * retrying until every token accepts — re-sends the same warning to the phones that already
 * got it, and a duplicated flood warning at 2 a.m. costs more trust than a missed one.
 */
export async function dispatchNewAlerts(): Promise<Result<DispatchReport, RequestError>> {
  const settled = await DeviceRepository.settleUnnotifiable(PUSH.ALERT_WINDOW_HOURS);
  if (settled.isErr()) return err(settled.error);

  const pending = await DeviceRepository.listPendingAlerts(
    PUSH.ALERT_WINDOW_HOURS,
    PUSH.MAX_ALERTS_PER_RUN,
  );
  if (pending.isErr()) return err(pending.error);
  if (pending.value.length === 0) {
    return ok({ alerts: 0, delivered: 0, tokensDisabled: 0, settled: settled.value });
  }

  const devices = await DeviceRepository.listActiveTokens();
  if (devices.isErr()) return err(devices.error);

  // No devices is not a reason to keep re-reading the same warnings: mark and move on.
  if (devices.value.length === 0) {
    const marked = await DeviceRepository.markNotified(pending.value.map((alert) => alert.id));
    if (marked.isErr()) return err(marked.error);
    return ok({
      alerts: pending.value.length,
      delivered: 0,
      tokensDisabled: 0,
      settled: settled.value,
    });
  }

  let delivered = 0;
  const deadTokens: string[] = [];

  for (const alert of pending.value) {
    const messages = devices.value.map((device: DeviceTokenRow) => ({
      to: device.token,
      ...buildMessage(alert, device.language),
      data: { alertId: alert.id, url: `/alerts/${alert.id}` },
    }));

    for (const batch of chunk(messages, PUSH.BATCH_SIZE)) {
      const result = await sendBatch(batch);
      delivered += result.delivered;
      deadTokens.push(...result.deadTokens);
    }
  }

  const disabled = await DeviceRepository.disableTokens(deadTokens);
  const marked = await DeviceRepository.markNotified(pending.value.map((alert) => alert.id));
  if (marked.isErr()) return err(marked.error);

  const report: DispatchReport = {
    alerts: pending.value.length,
    delivered,
    tokensDisabled: disabled.isOk() ? disabled.value : 0,
    settled: settled.value,
  };
  logger.info('alert notifications dispatched', report);
  return ok(report);
}
