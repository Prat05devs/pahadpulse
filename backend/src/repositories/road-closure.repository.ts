import { err, ok, type Result } from 'neverthrow';

import { db } from '../database/db.js';
import { AREAS_TABLE } from '../models/area.model.js';
import {
  ROAD_CLOSURES_TABLE,
  type RoadClosureRow,
  type RoadClosureStatus,
} from '../models/road-closure.model.js';
import { describeError } from '../utils/describe-error.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';

const logger = createLogger('@road-closure.repository');

export interface UpsertRoadClosureInput {
  sourceClosureKey: string;
  pwdRoadId: number;
  roadName: string;
  kmMarkers: string | null;
  roadType: string | null;
  department: string | null;
  division: string | null;
  districtRaw: string | null;
  areaId: number | null;
  status: RoadClosureStatus;
  /** UTC `YYYY-MM-DD HH:MM:SS`. */
  closedAt: string;
  expectedOpenAt: string | null;
}

export interface RoadClosureDisplay {
  /** Not open, and confirmed by the fetch that started at or after `confirmedSince`. */
  current: RoadClosureRow[];
  /** Open now, having closed or reopened within the look-back window. */
  recentlyReopened: RoadClosureRow[];
}

export interface IRoadClosureRepository {
  /**
   * The earliest closure date among roads still not open and seen in the last week — how
   * far back the next fetch must reach so that a long-running closure's reopening is seen.
   */
  oldestUnopenedClosedAt(sourceId: number): Promise<Result<string | null, RequestError>>;
  /**
   * Upserts one fetch in a single statement (DS-5). Open, unchanged rows are skipped, so a
   * poll every ten minutes rewrites a few dozen rows rather than the whole season.
   */
  upsertMany(
    sourceId: number,
    closures: readonly UpsertRoadClosureInput[],
    seenAt: string,
  ): Promise<Result<number, RequestError>>;
  listForDisplay(input: {
    sourceId: number;
    confirmedSince: string;
    reopenedSince: string;
    areaId: number | null;
  }): Promise<Result<RoadClosureDisplay, RequestError>>;
}

class RoadClosureRepositoryImpl implements IRoadClosureRepository {
  async oldestUnopenedClosedAt(sourceId: number): Promise<Result<string | null, RequestError>> {
    try {
      const { rows } = await db.query<{ oldest: string | null }>(
        `SELECT MIN(closed_at) AS oldest
           FROM ${ROAD_CLOSURES_TABLE}
          WHERE source_id = $1
            AND status <> 'open'
            AND last_seen_at >= (now() AT TIME ZONE 'utc') - INTERVAL '7 days'`,
        [sourceId],
      );
      return ok(rows[0]?.oldest ?? null);
    } catch (error) {
      logger.error('oldestUnopenedClosedAt failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async upsertMany(
    sourceId: number,
    closures: readonly UpsertRoadClosureInput[],
    seenAt: string,
  ): Promise<Result<number, RequestError>> {
    if (closures.length === 0) return ok(0);
    try {
      /*
       * One statement over UNNESTed column arrays rather than one INSERT per closure: a
       * season is ~2,300 rows, fetched every ten minutes.
       *
       * `status_changed_at` moves only when the status actually changes, which is what lets
       * the page say "reopened — first seen 11:20". The WHERE clause skips open rows whose
       * fields are unchanged; rows that are NOT open are always touched so `last_seen_at`
       * proves they were in this fetch.
       */
      const result = await db.query(
        `INSERT INTO ${ROAD_CLOSURES_TABLE} (
           source_id, source_closure_key, pwd_road_id, road_name, km_markers,
           road_type, department, division, district_raw, area_id, status, closed_at,
           expected_open_at, first_seen_at, status_changed_at, last_seen_at, fetched_at
         )
         SELECT $1, t.closure_key, t.road_id, t.road_name, t.km_markers,
                t.road_type, t.department, t.division, t.district_raw, t.area_id, t.status,
                t.closed_at, t.expected_open_at, $2, $2, $2, $2
           FROM UNNEST(
                  $3::varchar[], $4::integer[], $5::varchar[], $6::text[], $7::varchar[],
                  $8::varchar[], $9::varchar[], $10::varchar[], $11::integer[], $12::varchar[],
                  $13::timestamp[], $14::timestamp[]
                ) AS t(closure_key, road_id, road_name, km_markers, road_type,
                       department, division, district_raw, area_id, status, closed_at,
                       expected_open_at)
         ON CONFLICT (source_id, source_closure_key) DO UPDATE SET
           road_name         = EXCLUDED.road_name,
           km_markers        = EXCLUDED.km_markers,
           road_type         = EXCLUDED.road_type,
           department        = EXCLUDED.department,
           division          = EXCLUDED.division,
           district_raw      = EXCLUDED.district_raw,
           area_id           = EXCLUDED.area_id,
           closed_at         = EXCLUDED.closed_at,
           expected_open_at  = EXCLUDED.expected_open_at,
           status            = EXCLUDED.status,
           status_changed_at = CASE WHEN ${ROAD_CLOSURES_TABLE}.status <> EXCLUDED.status
                                    THEN EXCLUDED.last_seen_at
                                    ELSE ${ROAD_CLOSURES_TABLE}.status_changed_at END,
           last_seen_at      = EXCLUDED.last_seen_at,
           fetched_at        = EXCLUDED.fetched_at
         WHERE ${ROAD_CLOSURES_TABLE}.status <> 'open'
            OR EXCLUDED.status <> 'open'
            OR (${ROAD_CLOSURES_TABLE}.road_name, ${ROAD_CLOSURES_TABLE}.km_markers,
                ${ROAD_CLOSURES_TABLE}.road_type, ${ROAD_CLOSURES_TABLE}.department,
                ${ROAD_CLOSURES_TABLE}.division, ${ROAD_CLOSURES_TABLE}.area_id,
                ${ROAD_CLOSURES_TABLE}.closed_at, ${ROAD_CLOSURES_TABLE}.expected_open_at)
               IS DISTINCT FROM
               (EXCLUDED.road_name, EXCLUDED.km_markers, EXCLUDED.road_type,
                EXCLUDED.department, EXCLUDED.division, EXCLUDED.area_id,
                EXCLUDED.closed_at, EXCLUDED.expected_open_at)`,
        [
          sourceId,
          seenAt,
          closures.map((c) => c.sourceClosureKey),
          closures.map((c) => c.pwdRoadId),
          closures.map((c) => c.roadName),
          closures.map((c) => c.kmMarkers),
          closures.map((c) => c.roadType),
          closures.map((c) => c.department),
          closures.map((c) => c.division),
          closures.map((c) => c.districtRaw),
          closures.map((c) => c.areaId),
          closures.map((c) => c.status),
          closures.map((c) => c.closedAt),
          closures.map((c) => c.expectedOpenAt),
        ],
      );
      return ok(result.rowCount ?? 0);
    } catch (error) {
      logger.error('upsertMany failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listForDisplay(input: {
    sourceId: number;
    confirmedSince: string;
    reopenedSince: string;
    areaId: number | null;
  }): Promise<Result<RoadClosureDisplay, RequestError>> {
    try {
      const { rows } = await db.query<RoadClosureRow & { category: 'current' | 'reopened' }>(
        `SELECT c.id, c.road_name, c.road_type, c.km_markers, c.department, c.division,
                a.slug AS area_slug, a.name_en AS area_name_en, c.status, c.closed_at,
                c.expected_open_at, c.status_changed_at,
                CASE WHEN c.status = 'open' THEN 'reopened' ELSE 'current' END AS category
           FROM ${ROAD_CLOSURES_TABLE} c
           LEFT JOIN ${AREAS_TABLE} a ON a.id = c.area_id
          WHERE c.source_id = $1
            AND ($4::integer IS NULL OR c.area_id = $4)
            AND (
                  (c.status <> 'open' AND c.last_seen_at >= $2)
               OR (c.status = 'open'
                   AND ((c.status_changed_at >= $3 AND c.status_changed_at > c.first_seen_at)
                        OR c.closed_at >= $3))
                )
          ORDER BY CASE c.road_type WHEN 'NH' THEN 0 WHEN 'SH' THEN 1 WHEN 'MDR' THEN 2 ELSE 3 END,
                   c.closed_at DESC
          LIMIT 500`,
        [input.sourceId, input.confirmedSince, input.reopenedSince, input.areaId],
      );
      return ok({
        current: rows.filter((row) => row.category === 'current'),
        recentlyReopened: rows.filter((row) => row.category === 'reopened'),
      });
    } catch (error) {
      logger.error('listForDisplay failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }
}

export const RoadClosureRepository: IRoadClosureRepository = new RoadClosureRepositoryImpl();
