import { err, ok, type Result } from 'neverthrow';

import type { Alert, AlertOut } from '../models/alert.model.js';
import { AlertRepository, type ActiveAlertFilters } from '../repositories/alert.repository.js';
import { AreaRepository } from '../repositories/area.repository.js';
import { attachProvenance, publiclyDisplayable } from '../services/provenance.service.js';
import type { AlertSeverity, AlertType } from '../types/alert.js';
import type { Paginated } from '../types/pagination.js';
import { ERRORS, type RequestError } from '../utils/errors.js';

/**
 * Attaches provenance and drops anything from a source that may not be redistributed
 * (DS-6). This is the one place `Alert.issuedAt` is mapped onto `HasProvenance`'s
 * `vintage` field name — see 008-create-alerts.sql's header note on why an event uses
 * `issued_at` as its vintage.
 */
async function withProvenance(
  alerts: readonly Alert[],
  now?: Date,
): Promise<Result<AlertOut[], RequestError>> {
  const stamped = await attachProvenance(
    alerts.map((alert) => ({ ...alert, vintage: alert.issuedAt })),
    now,
  );
  if (stamped.isErr()) return err(stamped.error);

  const visible = publiclyDisplayable(stamped.value).map(({ vintage: _vintage, ...rest }) => rest);
  return ok(visible);
}

export interface ListActiveInput {
  cursor: number;
  limit: number;
  type?: AlertType;
  minSeverity?: AlertSeverity;
  areaSlug?: string;
}

export async function listActive(
  input: ListActiveInput,
  now?: Date,
): Promise<Result<Paginated<AlertOut>, RequestError>> {
  const filters: ActiveAlertFilters = {};
  if (input.type !== undefined) filters.type = input.type;
  if (input.minSeverity !== undefined) filters.minSeverity = input.minSeverity;

  if (input.areaSlug !== undefined) {
    const area = await AreaRepository.findBySlug(input.areaSlug);
    if (area.isErr()) return err(area.error);
    filters.areaId = area.value.id;
  }

  const page = await AlertRepository.listActive(input.cursor, input.limit, filters);
  if (page.isErr()) return err(page.error);

  const data = await withProvenance(page.value.data, now);
  if (data.isErr()) return err(data.error);

  return ok({ data: data.value, pagination: page.value.pagination });
}

export async function listActiveForArea(
  areaSlug: string,
  cursor: number,
  limit: number,
  now?: Date,
): Promise<Result<Paginated<AlertOut>, RequestError>> {
  return listActive({ cursor, limit, areaSlug }, now);
}

/**
 * A shared link to a warning that has since lapsed says so (410), rather than claiming it
 * never existed (404) — alerts.md §5. Both distinct from DS-6: a source we may not
 * redistribute is treated as not found at all, never partially revealed.
 */
export async function getById(
  id: number,
  now: Date = new Date(),
): Promise<Result<AlertOut, RequestError>> {
  const alert = await AlertRepository.findById(id);
  if (alert.isErr()) return err(alert.error);

  const stamped = await withProvenance([alert.value], now);
  if (stamped.isErr()) return err(stamped.error);

  const visible = stamped.value[0];
  if (visible === undefined) return err(ERRORS.ALERT_NOT_FOUND);

  if (visible.expiresAt !== null && new Date(`${visible.expiresAt.replace(' ', 'T')}Z`) <= now) {
    return err(ERRORS.ALERT_EXPIRED);
  }

  return ok(visible);
}

export interface AlertSummary {
  activeCount: number;
  bySeverity: Record<string, number>;
}

/**
 * Deliberately built from the same publicly-filtered list `listActive` uses, not from
 * `AlertRepository.countActive()` directly — a bare count is still a disclosure of what a
 * non-redistributable source contains, so DS-6 applies here exactly as it does to content.
 */
export async function getSummary(now?: Date): Promise<Result<AlertSummary, RequestError>> {
  const page = await AlertRepository.listActive(Number.MAX_SAFE_INTEGER, 500, {});
  if (page.isErr()) return err(page.error);

  const visible = await withProvenance(page.value.data, now);
  if (visible.isErr()) return err(visible.error);

  const bySeverity: Record<string, number> = {};
  for (const alert of visible.value) {
    bySeverity[alert.severity] = (bySeverity[alert.severity] ?? 0) + 1;
  }

  return ok({ activeCount: visible.value.length, bySeverity });
}
