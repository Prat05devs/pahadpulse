import { err, ok, type Result } from 'neverthrow';

import { db } from '../database/db.js';
import { ALERTS_TABLE, ALERT_AREAS_TABLE } from '../models/alert.model.js';
import {
  DEVICE_TOKENS_TABLE,
  type DeviceLanguage,
  type DevicePlatform,
  type DeviceTokenRow,
  type PendingAlertRow,
} from '../models/device.model.js';
import { SOURCES_TABLE } from '../models/source.model.js';
import { describeError } from '../utils/describe-error.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';

const logger = createLogger('@device.repository');

export interface RegisterDeviceInput {
  token: string;
  platform: DevicePlatform;
  language: DeviceLanguage;
}

export interface IDeviceRepository {
  register(input: RegisterDeviceInput): Promise<Result<void, RequestError>>;
  unregister(token: string): Promise<Result<void, RequestError>>;
  listActiveTokens(): Promise<Result<DeviceTokenRow[], RequestError>>;
  disableTokens(tokens: readonly string[]): Promise<Result<number, RequestError>>;
  listPendingAlerts(
    withinHours: number,
    limit: number,
  ): Promise<Result<PendingAlertRow[], RequestError>>;
  markNotified(alertIds: readonly number[]): Promise<Result<void, RequestError>>;
  settleUnnotifiable(withinHours: number): Promise<Result<number, RequestError>>;
}

class DeviceRepositoryImpl implements IDeviceRepository {
  /**
   * Registering the same token twice is the normal case, not an error: the app re-registers
   * on every launch, because a push token can rotate without the reader doing anything. The
   * upsert also clears `disabled_at`, which is what makes a reinstall start working again.
   */
  async register(input: RegisterDeviceInput): Promise<Result<void, RequestError>> {
    try {
      await db.query(
        `INSERT INTO ${DEVICE_TOKENS_TABLE} (token, platform, language)
         VALUES ($1, $2, $3)
         ON CONFLICT (token) DO UPDATE SET
           platform    = EXCLUDED.platform,
           language    = EXCLUDED.language,
           disabled_at = NULL,
           updated_at  = (now() AT TIME ZONE 'utc')`,
        [input.token, input.platform, input.language],
      );
      return ok(undefined);
    } catch (error) {
      logger.error('register failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /** Turning notifications off must take effect even if the row was never there. */
  async unregister(token: string): Promise<Result<void, RequestError>> {
    try {
      await db.query(`DELETE FROM ${DEVICE_TOKENS_TABLE} WHERE token = $1`, [token]);
      return ok(undefined);
    } catch (error) {
      logger.error('unregister failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listActiveTokens(): Promise<Result<DeviceTokenRow[], RequestError>> {
    try {
      const { rows } = await db.query<DeviceTokenRow>(
        `SELECT id, token, platform, language, disabled_at, created_at, updated_at
           FROM ${DEVICE_TOKENS_TABLE}
          WHERE disabled_at IS NULL
          ORDER BY id`,
      );
      return ok(rows);
    } catch (error) {
      logger.error('listActiveTokens failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /** Expo said these tokens no longer exist. Recorded, not deleted — see the migration. */
  async disableTokens(tokens: readonly string[]): Promise<Result<number, RequestError>> {
    if (tokens.length === 0) return ok(0);
    try {
      const { rowCount } = await db.query(
        `UPDATE ${DEVICE_TOKENS_TABLE}
            SET disabled_at = (now() AT TIME ZONE 'utc'),
                updated_at  = (now() AT TIME ZONE 'utc')
          WHERE token = ANY($1::varchar[]) AND disabled_at IS NULL`,
        [[...tokens]],
      );
      return ok(rowCount ?? 0);
    } catch (error) {
      logger.error('disableTokens failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /**
   * Warnings that have not been announced yet.
   *
   * Three filters, each load-bearing:
   *   - `may_redistribute` — DS-6 applies to a notification exactly as it does to the API. A
   *     source we may not republish must not be republished to a lock screen either.
   *   - still in force — a warning that expired while the server slept is not news.
   *   - `issued_at` inside the window — a run after a long outage announces what is current,
   *     not everything it missed. The rest are marked as announced without being sent.
   */
  async listPendingAlerts(
    withinHours: number,
    limit: number,
  ): Promise<Result<PendingAlertRow[], RequestError>> {
    try {
      const { rows } = await db.query<PendingAlertRow>(
        `SELECT a.id, a.headline, a.severity::text AS severity, a.type::text AS type,
                a.issued_at, a.expires_at,
                (SELECT array_agg(ar.name_en ORDER BY ar.name_en)
                   FROM ${ALERT_AREAS_TABLE} aa
                   JOIN areas ar ON ar.id = aa.area_id
                  WHERE aa.alert_id = a.id) AS area_names
           FROM ${ALERTS_TABLE} a
           JOIN ${SOURCES_TABLE} s ON s.id = a.source_id
          WHERE a.notified_at IS NULL
            AND s.may_redistribute = TRUE
            AND a.status = 'active'
            AND (a.expires_at IS NULL OR a.expires_at > (now() AT TIME ZONE 'utc'))
            AND a.issued_at > (now() AT TIME ZONE 'utc') - ($1 * INTERVAL '1 hour')
          ORDER BY a.issued_at ASC
          LIMIT $2`,
        [withinHours, limit],
      );
      return ok(rows);
    } catch (error) {
      logger.error('listPendingAlerts failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /**
   * Marks alerts announced.
   *
   * Called for alerts that were sent AND for ones deliberately skipped (expired, outside the
   * window, from a source we may not republish). Anything left NULL would be reconsidered on
   * every tick forever.
   */
  async markNotified(alertIds: readonly number[]): Promise<Result<void, RequestError>> {
    if (alertIds.length === 0) return ok(undefined);
    try {
      await db.query(
        `UPDATE ${ALERTS_TABLE}
            SET notified_at = (now() AT TIME ZONE 'utc')
          WHERE id = ANY($1::int[])`,
        [[...alertIds]],
      );
      return ok(undefined);
    } catch (error) {
      logger.error('markNotified failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /**
   * Closes out warnings that will never be announced: expired before anyone could be told,
   * older than the window, or from a source we may not republish.
   *
   * Without this they stay `notified_at IS NULL` forever, and the partial index that makes
   * the pending query cheap grows to hold every alert the system has ever stored.
   */
  async settleUnnotifiable(withinHours: number): Promise<Result<number, RequestError>> {
    try {
      const { rowCount } = await db.query(
        `UPDATE ${ALERTS_TABLE} a
            SET notified_at = (now() AT TIME ZONE 'utc')
           FROM ${SOURCES_TABLE} s
          WHERE s.id = a.source_id
            AND a.notified_at IS NULL
            AND (
              s.may_redistribute = FALSE
              OR a.status <> 'active'
              OR (a.expires_at IS NOT NULL AND a.expires_at <= (now() AT TIME ZONE 'utc'))
              OR a.issued_at <= (now() AT TIME ZONE 'utc') - ($1 * INTERVAL '1 hour')
            )`,
        [withinHours],
      );
      return ok(rowCount ?? 0);
    } catch (error) {
      logger.error('settleUnnotifiable failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }
}

export const DeviceRepository: IDeviceRepository = new DeviceRepositoryImpl();
