import type { ResultSetHeader } from 'mysql2';
import { err, ok, type Result } from 'neverthrow';

import { db } from '../database/db.js';
import {
  ALERT_AREAS_TABLE,
  ALERTS_TABLE,
  toAlert,
  type Alert,
  type AlertCountRow,
  type AlertRow,
  type AlertWithAreasRow,
} from '../models/alert.model.js';
import type { Paginated } from '../types/pagination.js';
import {
  AlertCertainty,
  AlertSeverity,
  AlertStatus,
  AlertType,
  AlertUrgency,
} from '../types/alert.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';
import { toPage } from '../utils/pagination.js';

const logger = createLogger('@alert.repository');

/**
 * Aggregates each alert's areas as a JSON array in one query — the alternative is an N+1
 * fetching areas per alert on every list endpoint (Q5).
 */
const ALERT_SELECT = `
  SELECT a.id, a.source_id, a.source_alert_id, a.type, a.severity, a.urgency, a.certainty,
         a.status, a.headline, a.body, a.instruction, a.language, a.authority, a.web_url,
         a.geometry, a.centroid_lat, a.centroid_lng,
         a.issued_at, a.effective_from, a.expires_at, a.fetched_at,
         COALESCE(
           (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', ar.id, 'slug', ar.slug, 'name_en', ar.name_en, 'name_hi', ar.name_hi))
              FROM ${ALERT_AREAS_TABLE} aa
              JOIN areas ar ON ar.id = aa.area_id
             WHERE aa.alert_id = a.id),
           JSON_ARRAY()
         ) AS area_ids
    FROM ${ALERTS_TABLE} a
`;

export interface UpsertAlertInput {
  sourceId: number;
  sourceAlertId: string;
  type: AlertType;
  severity: AlertSeverity;
  urgency: AlertUrgency;
  certainty: AlertCertainty;
  headline: string;
  body: string;
  instruction: string | null;
  language: string;
  authority: string;
  webUrl: string | null;
  issuedAt: string;
  effectiveFrom: string | null;
  expiresAt: string | null;
  areaIds: readonly number[];
  /**
   * GeoJSON Polygon/MultiPolygon of the affected area, already simplified for display.
   * Null for the many sources that state their area only in prose (migration 010).
   */
  geometry?: unknown;
  centroidLat?: number | null;
  centroidLng?: number | null;
}

export interface ActiveAlertFilters {
  type?: AlertType;
  minSeverity?: AlertSeverity;
  areaId?: number;
}

/** CAP's own severity ordering (alerts.md §8 — the scale is kept, not re-invented). */
const SEVERITY_RANK: Record<AlertSeverity, number> = {
  [AlertSeverity.Unknown]: 0,
  [AlertSeverity.Minor]: 1,
  [AlertSeverity.Moderate]: 2,
  [AlertSeverity.Severe]: 3,
  [AlertSeverity.Extreme]: 4,
};

export interface IAlertRepository {
  /**
   * Upserts by (source_id, source_alert_id) — ALR-1: a revised warning replaces ours,
   * never appends a second one. Areas are replaced atomically with the alert row.
   */
  upsert(input: UpsertAlertInput): Promise<Result<number, RequestError>>;
  cancel(sourceId: number, sourceAlertId: string): Promise<Result<boolean, RequestError>>;
  findById(id: number): Promise<Result<Alert, RequestError>>;
  listActive(
    cursor: number,
    limit: number,
    filters: ActiveAlertFilters,
  ): Promise<Result<Paginated<Alert>, RequestError>>;
  listActiveForArea(
    areaId: number,
    cursor: number,
    limit: number,
  ): Promise<Result<Paginated<Alert>, RequestError>>;
  countActive(): Promise<Result<number, RequestError>>;
}

class AlertRepositoryImpl implements IAlertRepository {
  async upsert(input: UpsertAlertInput): Promise<Result<number, RequestError>> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query<ResultSetHeader>(
        `INSERT INTO ${ALERTS_TABLE}
           (source_id, source_alert_id, type, severity, urgency, certainty, status,
            headline, body, instruction, language, authority, web_url,
            geometry, centroid_lat, centroid_lng,
            issued_at, effective_from, expires_at, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
         AS new
         ON DUPLICATE KEY UPDATE
           type = new.type, severity = new.severity, urgency = new.urgency,
           certainty = new.certainty, status = 'active',
           headline = new.headline, body = new.body, instruction = new.instruction,
           language = new.language, authority = new.authority, web_url = new.web_url,
           geometry = new.geometry,
           centroid_lat = new.centroid_lat, centroid_lng = new.centroid_lng,
           issued_at = new.issued_at, effective_from = new.effective_from,
           expires_at = new.expires_at, fetched_at = new.fetched_at`,
        [
          input.sourceId,
          input.sourceAlertId,
          input.type,
          input.severity,
          input.urgency,
          input.certainty,
          input.headline,
          input.body,
          input.instruction,
          input.language,
          input.authority,
          input.webUrl,
          input.geometry === undefined || input.geometry === null
            ? null
            : JSON.stringify(input.geometry),
          input.centroidLat ?? null,
          input.centroidLng ?? null,
          input.issuedAt,
          input.effectiveFrom,
          input.expiresAt,
        ],
      );

      const [idRows] = await connection.query<AlertRow[]>(
        `SELECT id FROM ${ALERTS_TABLE} WHERE source_id = ? AND source_alert_id = ? LIMIT 1`,
        [input.sourceId, input.sourceAlertId],
      );
      const alertId = idRows[0]?.id;
      if (alertId === undefined) throw new Error('upsert did not produce a row');

      // Areas are replaced wholesale rather than diffed: a revised CAP message can add or
      // drop area blocks, and there is no meaningful "partial" area update for an alert.
      await connection.query('DELETE FROM ' + ALERT_AREAS_TABLE + ' WHERE alert_id = ?', [alertId]);
      if (input.areaIds.length > 0) {
        const values = input.areaIds.map((areaId) => [alertId, areaId]);
        await connection.query(`INSERT INTO ${ALERT_AREAS_TABLE} (alert_id, area_id) VALUES ?`, [
          values,
        ]);
      }

      await connection.commit();
      return ok(alertId);
    } catch (error) {
      await connection.rollback();
      logger.error('upsert failed', { sourceAlertId: input.sourceAlertId, error });
      return err(ERRORS.DATABASE_ERROR);
    } finally {
      connection.release();
    }
  }

  async cancel(sourceId: number, sourceAlertId: string): Promise<Result<boolean, RequestError>> {
    try {
      const [result] = await db.query<ResultSetHeader>(
        `UPDATE ${ALERTS_TABLE} SET status = ? WHERE source_id = ? AND source_alert_id = ?`,
        [AlertStatus.Cancelled, sourceId, sourceAlertId],
      );
      return ok(result.affectedRows > 0);
    } catch (error) {
      logger.error('cancel failed', { sourceId, sourceAlertId, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async findById(id: number): Promise<Result<Alert, RequestError>> {
    try {
      const [rows] = await db.query<AlertWithAreasRow[]>(`${ALERT_SELECT} WHERE a.id = ? LIMIT 1`, [
        id,
      ]);
      const row = rows[0];
      if (row === undefined) return err(ERRORS.ALERT_NOT_FOUND);
      return ok(toAlert(row));
    } catch (error) {
      logger.error('findById failed', { id, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /**
   * ALR-3 — expiry is evaluated here, at read time, against `expires_at`. There is no
   * scheduled job that flips `status` to `expired`; "active" is always computed fresh.
   */
  async listActive(
    cursor: number,
    limit: number,
    filters: ActiveAlertFilters,
  ): Promise<Result<Paginated<Alert>, RequestError>> {
    try {
      const conditions = [
        "a.status = 'active'",
        '(a.expires_at IS NULL OR a.expires_at > UTC_TIMESTAMP())',
        'a.id < ?',
      ];
      const params: (string | number)[] = [cursor];

      if (filters.type !== undefined) {
        conditions.push('a.type = ?');
        params.push(filters.type);
      }
      if (filters.minSeverity !== undefined) {
        const minRank = SEVERITY_RANK[filters.minSeverity];
        const allowed = (Object.keys(SEVERITY_RANK) as AlertSeverity[]).filter(
          (severity) => SEVERITY_RANK[severity] >= minRank,
        );
        conditions.push(`a.severity IN (${allowed.map(() => '?').join(',')})`);
        params.push(...allowed);
      }

      let sql = ALERT_SELECT;
      if (filters.areaId !== undefined) {
        sql = `${ALERT_SELECT} JOIN ${ALERT_AREAS_TABLE} filter_area ON filter_area.alert_id = a.id AND filter_area.area_id = ?`;
        params.unshift(filters.areaId);
      }

      const [rows] = await db.query<AlertWithAreasRow[]>(
        `${sql}
          WHERE ${conditions.join(' AND ')}
          ORDER BY a.id DESC
          LIMIT ?`,
        [...params, limit + 1],
      );

      return ok(toPage(rows.map(toAlert), limit));
    } catch (error) {
      logger.error('listActive failed', { cursor, limit, filters, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listActiveForArea(
    areaId: number,
    cursor: number,
    limit: number,
  ): Promise<Result<Paginated<Alert>, RequestError>> {
    return this.listActive(cursor, limit, { areaId });
  }

  async countActive(): Promise<Result<number, RequestError>> {
    try {
      const [rows] = await db.query<AlertCountRow[]>(
        `SELECT COUNT(*) AS total FROM ${ALERTS_TABLE} a
          WHERE a.status = 'active' AND (a.expires_at IS NULL OR a.expires_at > UTC_TIMESTAMP())`,
      );
      return ok(rows[0]?.total ?? 0);
    } catch (error) {
      logger.error('countActive failed', { error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }
}

export const AlertRepository: IAlertRepository = new AlertRepositoryImpl();
