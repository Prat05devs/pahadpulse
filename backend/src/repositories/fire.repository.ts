import { err, ok, type Result } from 'neverthrow';

import { db } from '../database/db.js';
import {
  FIRE_DETECTIONS_TABLE,
  FIRE_DISTRICT_NOTICES_TABLE,
  toFireDetection,
  type FireConfidence,
  type FireDetectionOut,
  type FireDetectionRow,
  type PendingFireDistrictRow,
} from '../models/fire.model.js';
import { SOURCES_TABLE } from '../models/source.model.js';
import { describeError } from '../utils/describe-error.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';

const logger = createLogger('@fire.repository');

export interface UpsertFireInput {
  sourceEventId: string;
  sensor: string;
  satellite: string;
  instrument: string;
  confidence: FireConfidence;
  confidenceRaw: string;
  frpMw: number | null;
  brightnessK: number | null;
  dayNight: 'D' | 'N' | null;
  lat: number;
  lng: number;
  /** `YYYY-MM-DD HH:MM:SS`, UTC. */
  acquiredAt: string;
}

export interface IFireRepository {
  /**
   * Upserts by (source, detection key), keeping only points inside a district boundary.
   * Resolves to the number of rows written. Points outside the state are not errors, so
   * the connector counts them as the difference.
   */
  upsertMany(
    sourceId: number,
    detections: readonly UpsertFireInput[],
  ): Promise<Result<number, RequestError>>;
  /** Detections from redistributable sources acquired within the last `hours`, newest first. */
  listRecent(hours: number): Promise<Result<FireDetectionOut[], RequestError>>;
  /**
   * Closes detections that will never be announced: low confidence, older than the window,
   * from a source we may not republish, or in a district already notified within the
   * cooldown. Resolves to the number settled.
   */
  settleUnannounced(
    windowHours: number,
    cooldownHours: number,
    confidences: readonly string[],
  ): Promise<Result<number, RequestError>>;
  /** What remains after `settleUnannounced`: districts with detections to announce. */
  listPendingDistricts(): Promise<Result<PendingFireDistrictRow[], RequestError>>;
  /** Records the notice and marks that district's pending detections announced, in one go. */
  recordNotice(areaId: number, detections: number): Promise<Result<void, RequestError>>;
}

class FireRepositoryImpl implements IFireRepository {
  async upsertMany(
    sourceId: number,
    detections: readonly UpsertFireInput[],
  ): Promise<Result<number, RequestError>> {
    if (detections.length === 0) return ok(0);

    try {
      /*
       * One statement for the whole batch, with the rows passed as parallel arrays through
       * `unnest`. A bad fire day brings hundreds of rows, too many for a statement each.
       *
       * The district comes from ST_Covers against the full-precision boundary (not the
       * simplified map geometry), so a fire on a district border lands where the survey
       * boundary puts it. The inner join drops points that no district covers, which is
       * how the bounding box becomes the state's real shape. ST_MakePoint takes longitude
       * FIRST. Swapping the two raises no error; it just moves every fire into the sea.
       */
      const { rowCount } = await db.query(
        `INSERT INTO ${FIRE_DETECTIONS_TABLE}
           (source_id, source_event_id, area_id, sensor, satellite, instrument, confidence,
            confidence_raw, frp_mw, brightness_k, day_night, location, acquired_at)
         SELECT $1, v.source_event_id, d.area_id, v.sensor, v.satellite, v.instrument,
                v.confidence, v.confidence_raw, v.frp_mw, v.brightness_k, v.day_night,
                ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)::geography, v.acquired_at
           FROM unnest($2::varchar[], $3::varchar[], $4::varchar[], $5::varchar[],
                       $6::varchar[], $7::varchar[], $8::numeric[], $9::numeric[],
                       $10::varchar[], $11::float8[], $12::float8[], $13::timestamp[])
                  AS v(source_event_id, sensor, satellite, instrument, confidence,
                       confidence_raw, frp_mw, brightness_k, day_night, lng, lat, acquired_at)
           JOIN LATERAL (
             SELECT b.area_id
               FROM area_boundaries b
               JOIN areas a ON a.id = b.area_id
              WHERE a.type = 'district'
                AND ST_Covers(b.geom, ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326))
              ORDER BY b.area_id
              LIMIT 1
           ) d ON TRUE
         ON CONFLICT (source_id, source_event_id) DO UPDATE SET
           confidence     = EXCLUDED.confidence,
           confidence_raw = EXCLUDED.confidence_raw,
           frp_mw         = EXCLUDED.frp_mw,
           brightness_k   = EXCLUDED.brightness_k,
           day_night      = EXCLUDED.day_night,
           fetched_at     = (now() AT TIME ZONE 'utc')`,
        [
          sourceId,
          detections.map((d) => d.sourceEventId),
          detections.map((d) => d.sensor),
          detections.map((d) => d.satellite),
          detections.map((d) => d.instrument),
          detections.map((d) => d.confidence),
          detections.map((d) => d.confidenceRaw),
          detections.map((d) => d.frpMw),
          detections.map((d) => d.brightnessK),
          detections.map((d) => d.dayNight),
          detections.map((d) => d.lng),
          detections.map((d) => d.lat),
          detections.map((d) => d.acquiredAt),
        ],
      );
      return ok(rowCount ?? 0);
    } catch (error) {
      logger.error('upsertMany failed', { count: detections.length, error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listRecent(hours: number): Promise<Result<FireDetectionOut[], RequestError>> {
    try {
      // DS-6 is applied in the query: a source we may not republish returns nothing.
      const { rows } = await db.query<FireDetectionRow>(
        `SELECT f.id, f.sensor, f.satellite, f.instrument, f.confidence, f.frp_mw, f.day_night,
                ST_Y(f.location::geometry) AS lat, ST_X(f.location::geometry) AS lng,
                f.acquired_at, a.slug AS area_slug, a.name_en AS area_name_en,
                a.name_hi AS area_name_hi, s.attribution
           FROM ${FIRE_DETECTIONS_TABLE} f
           JOIN areas a ON a.id = f.area_id
           JOIN ${SOURCES_TABLE} s ON s.id = f.source_id
          WHERE s.may_redistribute = TRUE
            AND f.acquired_at > (now() AT TIME ZONE 'utc') - ($1 * INTERVAL '1 hour')
          ORDER BY f.acquired_at DESC`,
        [hours],
      );
      return ok(rows.map(toFireDetection).filter((row): row is FireDetectionOut => row !== null));
    } catch (error) {
      logger.error('listRecent failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async settleUnannounced(
    windowHours: number,
    cooldownHours: number,
    confidences: readonly string[],
  ): Promise<Result<number, RequestError>> {
    try {
      const { rowCount } = await db.query(
        `UPDATE ${FIRE_DETECTIONS_TABLE} f
            SET notified_at = (now() AT TIME ZONE 'utc')
           FROM ${SOURCES_TABLE} s
          WHERE s.id = f.source_id
            AND f.notified_at IS NULL
            AND (
              s.may_redistribute = FALSE
              OR f.confidence <> ALL($3::varchar[])
              OR f.acquired_at <= (now() AT TIME ZONE 'utc') - ($1 * INTERVAL '1 hour')
              OR EXISTS (
                SELECT 1 FROM ${FIRE_DISTRICT_NOTICES_TABLE} n
                 WHERE n.area_id = f.area_id
                   AND n.notified_at > (now() AT TIME ZONE 'utc') - ($2 * INTERVAL '1 hour')
              )
            )`,
        [windowHours, cooldownHours, [...confidences]],
      );
      return ok(rowCount ?? 0);
    } catch (error) {
      logger.error('settleUnannounced failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listPendingDistricts(): Promise<Result<PendingFireDistrictRow[], RequestError>> {
    try {
      const { rows } = await db.query<PendingFireDistrictRow>(
        `SELECT a.id AS area_id, a.slug, a.name_en, a.name_hi, COUNT(*) AS detections
           FROM ${FIRE_DETECTIONS_TABLE} f
           JOIN areas a ON a.id = f.area_id
          WHERE f.notified_at IS NULL
          GROUP BY a.id, a.slug, a.name_en, a.name_hi
          ORDER BY detections DESC`,
      );
      return ok(rows);
    } catch (error) {
      logger.error('listPendingDistricts failed', { error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async recordNotice(areaId: number, detections: number): Promise<Result<void, RequestError>> {
    try {
      // One statement, so the notice and the marks cannot disagree after a failure.
      await db.query(
        `WITH notice AS (
           INSERT INTO ${FIRE_DISTRICT_NOTICES_TABLE} (area_id, notified_at, detection_count)
           VALUES ($1, (now() AT TIME ZONE 'utc'), $2)
           ON CONFLICT (area_id) DO UPDATE SET
             notified_at = EXCLUDED.notified_at,
             detection_count = EXCLUDED.detection_count
         )
         UPDATE ${FIRE_DETECTIONS_TABLE}
            SET notified_at = (now() AT TIME ZONE 'utc')
          WHERE area_id = $1 AND notified_at IS NULL`,
        [areaId, detections],
      );
      return ok(undefined);
    } catch (error) {
      logger.error('recordNotice failed', { areaId, error: describeError(error) });
      return err(ERRORS.DATABASE_ERROR);
    }
  }
}

export const FireRepository: IFireRepository = new FireRepositoryImpl();
