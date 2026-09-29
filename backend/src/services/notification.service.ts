import { err, ok, type Result } from 'neverthrow';
import { z } from 'zod';

import { FIRE_PUSH, PUSH } from '../config/constants.js';
import { env } from '../config/env.js';
import type { DeviceTokenRow, PendingAlertRow } from '../models/device.model.js';
import type { PendingFireDistrictRow } from '../models/fire.model.js';
import { DeviceRepository } from '../repositories/device.repository.js';
import { FireRepository } from '../repositories/fire.repository.js';
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
  /** Accepted by Expo for provider handoff; final status is checked through receipts. */
  accepted: number;
  tokensDisabled: number;
  settled: number;
}

export interface ReceiptReport {
  requested: number;
  resolved: number;
  tokensDisabled: number;
  expired: number;
}

const ExpoTicketSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), id: z.string().min(1) }).loose(),
  z
    .object({
      status: z.literal('error'),
      message: z.string().optional(),
      details: z.object({ error: z.string().optional() }).loose().optional(),
    })
    .loose(),
]);

/** Expo replies with exactly one ticket per message, in the same order. */
const ExpoResponseSchema = z.object({ data: z.array(ExpoTicketSchema) }).loose();

const ExpoReceiptSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok') }).loose(),
  z
    .object({
      status: z.literal('error'),
      message: z.string().optional(),
      details: z.object({ error: z.string().optional() }).loose().optional(),
    })
    .loose(),
]);

const ExpoReceiptResponseSchema = z
  .object({ data: z.record(z.string(), ExpoReceiptSchema) })
  .loose();

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
  messages: {
    to: string;
    title: string;
    body: string;
    data: Record<string, unknown>;
    sound: 'default';
    priority: 'high';
    channelId: 'alerts';
  }[],
): Promise<{
  accepted: number;
  deadTokens: string[];
  receiptTickets: { ticketId: string; token: string }[];
  reached: boolean;
}> {
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
    return { accepted: 0, deadTokens: [], receiptTickets: [], reached: false };
  }

  if (!response.ok) {
    logger.warn('push rejected', { status: response.status });
    return { accepted: 0, deadTokens: [], receiptTickets: [], reached: false };
  }

  let rawPayload: unknown;
  try {
    rawPayload = await response.json();
  } catch (error) {
    logger.warn('push response was not JSON', { error: describeError(error) });
    return { accepted: 0, deadTokens: [], receiptTickets: [], reached: false };
  }

  const payload = ExpoResponseSchema.safeParse(rawPayload);
  if (!payload.success) {
    logger.warn('push response had an invalid shape', {
      issues: payload.error.issues.slice(0, 3).map((issue) => issue.message),
    });
    return { accepted: 0, deadTokens: [], receiptTickets: [], reached: false };
  }

  const tickets = payload.data.data;
  if (tickets.length !== messages.length) {
    logger.warn('push response ticket count did not match the request', {
      messages: messages.length,
      tickets: tickets.length,
    });
    return { accepted: 0, deadTokens: [], receiptTickets: [], reached: false };
  }

  const deadTokens: string[] = [];
  const receiptTickets: { ticketId: string; token: string }[] = [];
  let accepted = 0;

  tickets.forEach((ticket, index) => {
    if (ticket.status === 'ok') {
      const token = messages[index]?.to;
      if (token !== undefined) {
        accepted += 1;
        receiptTickets.push({ ticketId: ticket.id, token });
      }
      return;
    }
    const token = messages[index]?.to;
    if (ticket.details?.error === 'DeviceNotRegistered' && token !== undefined) {
      deadTokens.push(token);
      return;
    }
    logger.warn('push ticket failed', { error: ticket.details?.error, message: ticket.message });
  });

  return { accepted, deadTokens, receiptTickets, reached: true };
}

/**
 * Resolves Expo tickets after the recommended delay and retires tokens rejected by APNs/FCM.
 * Missing receipts remain queued until Expo's 24-hour retention window expires.
 */
export async function reconcilePushReceipts(): Promise<Result<ReceiptReport, RequestError>> {
  const pruned = await DeviceRepository.prunePushTickets(PUSH.RECEIPT_RETENTION_HOURS);
  if (pruned.isErr()) return err(pruned.error);

  const pending = await DeviceRepository.listPendingPushTickets(
    PUSH.RECEIPT_DELAY_MINUTES,
    PUSH.RECEIPT_RETENTION_HOURS,
    PUSH.RECEIPT_BATCH_SIZE,
  );
  if (pending.isErr()) return err(pending.error);
  if (pending.value.length === 0) {
    return ok({ requested: 0, resolved: 0, tokensDisabled: 0, expired: pruned.value });
  }

  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
  };
  if (env.EXPO_ACCESS_TOKEN !== undefined) {
    headers.authorization = `Bearer ${env.EXPO_ACCESS_TOKEN}`;
  }

  let response: Response;
  try {
    response = await fetch(PUSH.EXPO_RECEIPTS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids: pending.value.map((ticket) => ticket.ticket_id) }),
      signal: AbortSignal.timeout(PUSH.TIMEOUT_MS),
    });
  } catch (error) {
    logger.warn('push receipt transport failed', { error: describeError(error) });
    return ok({
      requested: pending.value.length,
      resolved: 0,
      tokensDisabled: 0,
      expired: pruned.value,
    });
  }

  if (!response.ok) {
    logger.warn('push receipt request rejected', { status: response.status });
    return ok({
      requested: pending.value.length,
      resolved: 0,
      tokensDisabled: 0,
      expired: pruned.value,
    });
  }

  let rawPayload: unknown;
  try {
    rawPayload = await response.json();
  } catch (error) {
    logger.warn('push receipt response was not JSON', { error: describeError(error) });
    return ok({
      requested: pending.value.length,
      resolved: 0,
      tokensDisabled: 0,
      expired: pruned.value,
    });
  }

  const payload = ExpoReceiptResponseSchema.safeParse(rawPayload);
  if (!payload.success) {
    logger.warn('push receipt response had an invalid shape', {
      issues: payload.error.issues.slice(0, 3).map((issue) => issue.message),
    });
    return ok({
      requested: pending.value.length,
      resolved: 0,
      tokensDisabled: 0,
      expired: pruned.value,
    });
  }

  const resolvedIds: string[] = [];
  const deadTokens: string[] = [];
  for (const ticket of pending.value) {
    const receipt = payload.data.data[ticket.ticket_id];
    if (receipt === undefined) continue;
    resolvedIds.push(ticket.ticket_id);
    if (receipt.status === 'error') {
      if (receipt.details?.error === 'DeviceNotRegistered') {
        deadTokens.push(ticket.device_token);
      } else {
        logger.warn('push receipt failed', {
          ticketId: ticket.ticket_id,
          error: receipt.details?.error,
          message: receipt.message,
        });
      }
    }
  }

  const disabled = await DeviceRepository.disableTokens(deadTokens);
  if (disabled.isErr()) return err(disabled.error);
  const removed = await DeviceRepository.deletePushTickets(resolvedIds);
  if (removed.isErr()) return err(removed.error);

  const report: ReceiptReport = {
    requested: pending.value.length,
    resolved: removed.value,
    tokensDisabled: disabled.value,
    expired: pruned.value,
  };
  logger.info('push receipts reconciled', report);
  return ok(report);
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
    return ok({ alerts: 0, accepted: 0, tokensDisabled: 0, settled: settled.value });
  }

  const devices = await DeviceRepository.listActiveTokens();
  if (devices.isErr()) return err(devices.error);

  // No devices is not a reason to keep re-reading the same warnings: mark and move on.
  if (devices.value.length === 0) {
    const marked = await DeviceRepository.markNotified(pending.value.map((alert) => alert.id));
    if (marked.isErr()) return err(marked.error);
    return ok({
      alerts: pending.value.length,
      accepted: 0,
      tokensDisabled: 0,
      settled: settled.value,
    });
  }

  let accepted = 0;
  const deadTokens: string[] = [];
  const receiptTickets: { ticketId: string; token: string }[] = [];
  /**
   * Which warnings actually reached the push service.
   *
   * Only these are recorded as announced. A warning whose every batch failed at the
   * transport — Expo down, no network out of the free instance — is left alone, so the next
   * pass tries again rather than losing it; the 3-hour window is what stops that retrying
   * forever. A warning that reached Expo is marked whatever the individual tickets said,
   * because re-sending it would duplicate the notification on every phone that did get it.
   */
  const announced: number[] = [];

  for (const alert of pending.value) {
    const messages = devices.value.map((device: DeviceTokenRow) => ({
      to: device.token,
      ...buildMessage(alert, device.language),
      data: { alertId: alert.id, url: `/alerts/${alert.id}` },
      // Background delivery uses payload policy, not the foreground JS handler. Without
      // these fields iOS is silent and Android can fall back to a low-importance channel.
      sound: 'default' as const,
      priority: 'high' as const,
      channelId: 'alerts' as const,
    }));

    let reached = false;
    for (const batch of chunk(messages, PUSH.BATCH_SIZE)) {
      const result = await sendBatch(batch);
      accepted += result.accepted;
      deadTokens.push(...result.deadTokens);
      receiptTickets.push(...result.receiptTickets);
      reached = reached || result.reached;
    }
    if (reached) announced.push(alert.id);
  }

  const disabled = await DeviceRepository.disableTokens(deadTokens);
  const savedTickets = await DeviceRepository.savePushTickets(receiptTickets);
  if (savedTickets.isErr()) {
    // Expo already accepted these messages. Retrying the warning would duplicate it, so the
    // alert is still marked announced while the persistence failure is made visible in logs.
    logger.error('accepted push tickets could not be persisted', {
      count: receiptTickets.length,
      code: savedTickets.error.code,
    });
  }
  const marked = await DeviceRepository.markNotified(announced);
  if (marked.isErr()) return err(marked.error);

  const report: DispatchReport = {
    alerts: announced.length,
    accepted,
    tokensDisabled: disabled.isOk() ? disabled.value : 0,
    settled: settled.value,
  };
  logger.info('alert notifications dispatched', report);
  return ok(report);
}

export interface FireDispatchReport {
  districts: number;
  accepted: number;
  settled: number;
}

/**
 * Wording for one district's fire notification.
 *
 * It says what the satellite saw and nothing more. A hot pixel can be a crop burn as easily
 * as a forest fire, and a lock-screen message that said "forest fire in Almora" would be
 * this product asserting something neither NASA nor the Forest Department stated (WLD-2).
 */
export function buildFireMessage(
  district: PendingFireDistrictRow,
  language: 'en' | 'hi',
): { title: string; body: string } {
  const count = district.detections;
  if (language === 'hi') {
    return {
      title: `उपग्रह से आग का संकेत · ${district.name_hi ?? district.name_en}`,
      body:
        `नासा उपग्रहों ने ${count} जगह असामान्य गर्मी दर्ज की। यह जंगल की आग या नियंत्रित ` +
        'जलाना हो सकता है। ज़मीन पर पुष्टि नहीं हुई है। नक्शे पर देखें।',
    };
  }
  return {
    title: `Satellite fire detection · ${district.name_en}`,
    body:
      `NASA satellites detected ${count} heat ${count === 1 ? 'signature' : 'signatures'}. ` +
      'It may be a forest fire or a controlled burn and is not confirmed on the ground. ' +
      'See the map.',
  };
}

/**
 * One pass of fire notifications: at most one per district per FIRE_PUSH.COOLDOWN_HOURS.
 *
 * Detections that will never be announced are settled first: low confidence, older than
 * the window, or in a district that was already told within the cooldown. Whatever is left
 * is grouped by district, and each district gets one message. As with warnings, a district
 * whose sends never reached Expo is left pending so the next pass retries it.
 */
export async function dispatchFireNotifications(): Promise<
  Result<FireDispatchReport, RequestError>
> {
  const settled = await FireRepository.settleUnannounced(
    FIRE_PUSH.WINDOW_HOURS,
    FIRE_PUSH.COOLDOWN_HOURS,
    FIRE_PUSH.CONFIDENCE,
  );
  if (settled.isErr()) return err(settled.error);

  const pending = await FireRepository.listPendingDistricts();
  if (pending.isErr()) return err(pending.error);
  if (pending.value.length === 0) {
    return ok({ districts: 0, accepted: 0, settled: settled.value });
  }

  const devices = await DeviceRepository.listActiveTokens();
  if (devices.isErr()) return err(devices.error);

  let accepted = 0;
  let announced = 0;
  const deadTokens: string[] = [];
  const receiptTickets: { ticketId: string; token: string }[] = [];

  for (const district of pending.value) {
    const messages = devices.value.map((device: DeviceTokenRow) => ({
      to: device.token,
      ...buildFireMessage(district, device.language),
      data: { fireDistrict: district.slug, url: '/map' },
      sound: 'default' as const,
      priority: 'high' as const,
      channelId: 'alerts' as const,
    }));

    // No devices still counts as reached: nobody is waiting, and the cooldown must start.
    let reached = messages.length === 0;
    for (const batch of chunk(messages, PUSH.BATCH_SIZE)) {
      const result = await sendBatch(batch);
      accepted += result.accepted;
      deadTokens.push(...result.deadTokens);
      receiptTickets.push(...result.receiptTickets);
      reached = reached || result.reached;
    }
    if (!reached) continue;

    const recorded = await FireRepository.recordNotice(district.area_id, district.detections);
    if (recorded.isErr()) return err(recorded.error);
    announced += 1;
  }

  await DeviceRepository.disableTokens(deadTokens);
  const savedTickets = await DeviceRepository.savePushTickets(receiptTickets);
  if (savedTickets.isErr()) {
    logger.error('accepted push tickets could not be persisted', {
      count: receiptTickets.length,
      code: savedTickets.error.code,
    });
  }

  const report: FireDispatchReport = { districts: announced, accepted, settled: settled.value };
  logger.info('fire notifications dispatched', report);
  return ok(report);
}
