import { err, ok, type Result } from 'neverthrow';

import { db } from '../database/db.js';
import { bulkValues } from '../database/sql.js';
import {
  ALERT_AREAS_TABLE,
  ALERTS_TABLE,
  toAlert,
  type Alert,
  type AlertCountRow,
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
         ST_AsGeoJSON(a.geom) AS geometry,
         ST_Y(a.centroid::geometry) AS centroid_lat,
         ST_X(a.centroid::geometry) AS centroid_lng,
         a.issued_at, a.effective_from, a.expires_at, a.fetched_at,
         COALESCE(
           (SELECT json_agg(json_build_object('id', ar.id, 'slug', ar.slug, 'name_en', ar.name_en, 'name_hi', ar.name_hi))
              FROM ${ALERT_AREAS_TABLE} aa
              JOIN areas ar ON ar.id = aa.area_id
             WHERE aa.alert_id = a.id),
           '[]'::json
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
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      /*
       * `RETURNING id` replaces the follow-up SELECT the MySQL version needed. MySQL's
       * `insertId` is 0 on the update branch of an upsert, so the old code had to re-read
       * the row to learn its id; Postgres returns it from either branch.
       *
       * Geometry arrives as GeoJSON text and is converted in SQL. `ST_Multi` normalises a
       * single Polygon into the MultiPolygon the column holds, and the whole expression is
       * NULL-safe because most alerts have no polygon at all — SACHET's polygon endpoint
       * returns 403.
       */
      const upserted = await client.query<{ id: number }>(
        `INSERT INTO ${ALERTS_TABLE}
           (source_id, source_alert_id, type, severity, urgency, certainty, status,
            headline, body, instruction, language, authority, web_url,
            geom, centroid,
            issued_at, effective_from, expires_at, fetched_at)
         VALUES (
           $1, $2, $3, $4, $5, $6, 'active',
           $7, $8, $9, $10, $11, $12,
           CASE WHEN $13::text IS NULL THEN NULL
                ELSE ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($13::text), 4326)) END,
           CASE WHEN $14::double precision IS NULL OR $15::double precision IS NULL THEN NULL
                ELSE ST_SetSRID(ST_MakePoint($14::double precision, $15::double precision), 4326)::geography END,
           $16, $17, $18, (now() AT TIME ZONE 'utc')
         )
         ON CONFLICT (source_id, source_alert_id) DO UPDATE SET
           type = EXCLUDED.type, severity = EXCLUDED.severity, urgency = EXCLUDED.urgency,
           certainty = EXCLUDED.certainty, status = 'active',
           headline = EXCLUDED.headline, body = EXCLUDED.body,
           instruction = EXCLUDED.instruction, language = EXCLUDED.language,
           authority = EXCLUDED.authority, web_url = EXCLUDED.web_url,
           geom = EXCLUDED.geom, centroid = EXCLUDED.centroid,
           issued_at = EXCLUDED.issued_at, effective_from = EXCLUDED.effective_from,
           expires_at = EXCLUDED.expires_at, fetched_at = EXCLUDED.fetched_at
         RETURNING id`,
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
          // lng then lat: ST_MakePoint takes X before Y.
          input.centroidLng ?? null,
          input.centroidLat ?? null,
          input.issuedAt,
          input.effectiveFrom,
          input.expiresAt,
        ],
      );

      const alertId = upserted.rows[0]?.id;
      if (alertId === undefined) throw new Error('upsert did not produce a row');

      // Areas are replaced wholesale rather than diffed: a revised CAP message can add or
      // drop area blocks, and there is no meaningful "partial" area update for an alert.
      await client.query(`DELETE FROM ${ALERT_AREAS_TABLE} WHERE alert_id = $1`, [alertId]);
      if (input.areaIds.length > 0) {
        const { text, params } = bulkValues(input.areaIds.map((areaId) => [alertId, areaId]));
        await client.query(
          `INSERT INTO ${ALERT_AREAS_TABLE} (alert_id, area_id) VALUES ${text}`,
          params,
        );
      }

      await client.query('COMMIT');
      return ok(alertId);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('upsert failed', { sourceAlertId: input.sourceAlertId, error });
      return err(ERRORS.DATABASE_ERROR);
    } finally {
      client.release();
    }
  }

  async cancel(sourceId: number, sourceAlertId: string): Promise<Result<boolean, RequestError>> {
    try {
      const result = await db.query(
        `UPDATE ${ALERTS_TABLE} SET status = $1 WHERE source_id = $2 AND source_alert_id = $3`,
        [AlertStatus.Cancelled, sourceId, sourceAlertId],
      );
      // `rowCount` is `number | null` in pg's types; null means the command reports no
      // count, which for an UPDATE means nothing matched.
      return ok((result.rowCount ?? 0) > 0);
    } catch (error) {
      logger.error('cancel failed', { sourceId, sourceAlertId, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async findById(id: number): Promise<Result<Alert, RequestError>> {
    try {
      const { rows } = await db.query<AlertWithAreasRow>(`${ALERT_SELECT} WHERE a.id = $1 LIMIT 1`, [
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
      /*
       * Placeholders are numbered as the parameters are pushed, not written literally.
       *
       * Postgres uses positional `$n` where MySQL used a bare `?`, so a query assembled
       * from optional fragments has to keep the two in step — a hardcoded number silently
       * binds the wrong value the moment an earlier filter is absent. `next()` makes the
       * position a consequence of pushing rather than something to remember.
       */
      const params: (string | number)[] = [];
      const next = (value: string | number): string => {
        params.push(value);
        return `$${params.length}`;
      };

      // The area filter joins before the WHERE clause, so its parameter has to be bound
      // first — hence the join is built before any condition below.
      let sql = ALERT_SELECT;
      if (filters.areaId !== undefined) {
        sql =
          `${ALERT_SELECT} JOIN ${ALERT_AREAS_TABLE} filter_area ` +
          `ON filter_area.alert_id = a.id AND filter_area.area_id = ${next(filters.areaId)}`;
      }

      const conditions = [
        "a.status = 'active'",
        "(a.expires_at IS NULL OR a.expires_at > (now() AT TIME ZONE 'utc'))",
        // ::bigint because the "start from the top" sentinel is Number.MAX_SAFE_INTEGER,
        // which does not fit the int4 `id` column. Comparing int4 to bigint is exact.
        `a.id < ${next(cursor)}::bigint`,
      ];

      if (filters.type !== undefined) {
        conditions.push(`a.type = ${next(filters.type)}`);
      }
      if (filters.minSeverity !== undefined) {
        const minRank = SEVERITY_RANK[filters.minSeverity];
        const allowed = (Object.keys(SEVERITY_RANK) as AlertSeverity[]).filter(
          (severity) => SEVERITY_RANK[severity] >= minRank,
        );
        conditions.push(
          `a.severity IN (${allowed.map((severity) => next(severity)).join(', ')})`,
        );
      }

      const { rows } = await db.query<AlertWithAreasRow>(
        `${sql}
          WHERE ${conditions.join(' AND ')}
          ORDER BY a.id DESC
          LIMIT ${next(limit + 1)}`,
        params,
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
      const { rows } = await db.query<AlertCountRow>(
        `SELECT COUNT(*) AS total FROM ${ALERTS_TABLE} a
          WHERE a.status = 'active' AND (a.expires_at IS NULL OR a.expires_at > (now() AT TIME ZONE 'utc'))`,
      );
      return ok(rows[0]?.total ?? 0);
    } catch (error) {
      logger.error('countActive failed', { error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }
}

export const AlertRepository: IAlertRepository = new AlertRepositoryImpl();
