import { err, ok, type Result } from 'neverthrow';

import { db } from '../database/db.js';
import {
  ROAD_ROUTES_TABLE,
  toRoadRoute,
  type RoadNetwork,
  type RoadRoute,
  type RoadRouteRow,
} from '../models/road.model.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';

const logger = createLogger('@road.repository');

export interface UpsertRoadRouteInput {
  ref: string;
  network: RoadNetwork;
  routeNumber: string;
  segmentCount: number;
  bounds: [number, number, number, number] | null;
  sourceId: number;
  vintage: string;
}

export interface IRoadRepository {
  /**
   * Every highway, ordered NH before SH and numerically within each. Bounded at a few dozen
   * rows for one state, so unpaginated — the whole network is one response.
   */
  listRoutes(): Promise<Result<RoadRoute[], RequestError>>;
  /** Replaces the whole set for a source in one transaction (DS-5: idempotent). */
  replaceRoutes(
    sourceId: number,
    routes: readonly UpsertRoadRouteInput[]
  ): Promise<Result<number, RequestError>>;
}

class RoadRepositoryImpl implements IRoadRepository {
  async listRoutes(): Promise<Result<RoadRoute[], RequestError>> {
    try {
      const [rows] = await db.query<RoadRouteRow[]>(
        `SELECT id, ref, network, route_number, segment_count,
                min_lat, min_lng, max_lat, max_lng,
                source_id, vintage, fetched_at
           FROM ${ROAD_ROUTES_TABLE}
          ORDER BY network ASC,
                   CAST(route_number AS UNSIGNED) ASC,
                   route_number ASC`
      );
      return ok(rows.map(toRoadRoute));
    } catch (error) {
      logger.error('listRoutes failed', { error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /**
   * Replace rather than merge.
   *
   * A highway that has been retagged or removed upstream must disappear from our list too —
   * merging would leave a decommissioned route on the page forever with no way to retire it.
   * The delete and the insert share one transaction so a failure mid-way cannot leave the
   * table empty (DS-4: a failed run never destroys what we already had).
   */
  async replaceRoutes(
    sourceId: number,
    routes: readonly UpsertRoadRouteInput[]
  ): Promise<Result<number, RequestError>> {
    if (routes.length === 0) return ok(0);

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(`DELETE FROM ${ROAD_ROUTES_TABLE} WHERE source_id = ?`, [sourceId]);

      const now = new Date();
      const values = routes.map((route) => [
        route.ref,
        route.network,
        route.routeNumber,
        route.segmentCount,
        route.bounds?.[1] ?? null,
        route.bounds?.[0] ?? null,
        route.bounds?.[3] ?? null,
        route.bounds?.[2] ?? null,
        route.sourceId,
        route.vintage,
        now,
      ]);

      await connection.query(
        `INSERT INTO ${ROAD_ROUTES_TABLE}
           (ref, network, route_number, segment_count,
            min_lat, min_lng, max_lat, max_lng,
            source_id, vintage, fetched_at)
         VALUES ?`,
        [values]
      );

      await connection.commit();
      return ok(routes.length);
    } catch (error) {
      await connection.rollback();
      logger.error('replaceRoutes failed', { sourceId, error });
      return err(ERRORS.DATABASE_ERROR);
    } finally {
      connection.release();
    }
  }
}

export const RoadRepository: IRoadRepository = new RoadRepositoryImpl();
