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
      const { rows } = await db.query<RoadRouteRow>(
        /*
         * The envelope is projected back to the four numbers the model expects, so the
         * change to a geometry column stops at this repository.
         *
         * `CAST(... AS UNSIGNED)` was MySQL; Postgres spells it `::integer`. The regex
         * guard matters — `route_number` holds values like `109A`, and casting that would
         * raise rather than sort, which is exactly the kind of break a straight dialect
         * swap hides until a specific highway appears in the data.
         */
        `SELECT id, ref, network, route_number, segment_count,
                ST_YMin(bounds) AS min_lat, ST_XMin(bounds) AS min_lng,
                ST_YMax(bounds) AS max_lat, ST_XMax(bounds) AS max_lng,
                source_id, vintage, fetched_at
           FROM ${ROAD_ROUTES_TABLE}
          ORDER BY network ASC,
                   CASE WHEN route_number ~ '^[0-9]+$'
                        THEN route_number::integer ELSE NULL END ASC NULLS LAST,
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

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      await client.query(`DELETE FROM ${ROAD_ROUTES_TABLE} WHERE source_id = $1`, [sourceId]);

      /*
       * The four bounds columns became one `geometry(Polygon)`. `ST_MakeEnvelope` builds
       * the box from the same west/south/east/north values the connector already produces,
       * which means the extent can be indexed and queried spatially instead of being four
       * numbers the application has to reassemble.
       *
       * Built by hand rather than with `bulkValues` because that slot is a constructed
       * geometry wrapping four placeholders, not a placeholder of its own — and it is NULL
       * for a route whose ways could not be assembled.
       */
      const params: unknown[] = [];
      const tuples: string[] = [];

      for (const route of routes) {
        const base = params.length;
        params.push(
          route.ref,
          route.network,
          route.routeNumber,
          route.segmentCount,
          route.bounds?.[0] ?? null,
          route.bounds?.[1] ?? null,
          route.bounds?.[2] ?? null,
          route.bounds?.[3] ?? null,
          route.sourceId,
          route.vintage,
        );
        const p = (offset: number) => `$${base + offset}`;
        tuples.push(
          `(${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ` +
            `CASE WHEN ${p(5)}::double precision IS NULL THEN NULL ` +
            `ELSE ST_MakeEnvelope(${p(5)}::double precision, ${p(6)}::double precision, ` +
            `${p(7)}::double precision, ${p(8)}::double precision, 4326) END, ` +
            `${p(9)}, ${p(10)}, (now() AT TIME ZONE 'utc'))`,
        );
      }

      await client.query(
        `INSERT INTO ${ROAD_ROUTES_TABLE}
           (ref, network, route_number, segment_count, bounds,
            source_id, vintage, fetched_at)
         VALUES ${tuples.join(', ')}`,
        params,
      );

      await client.query('COMMIT');
      return ok(routes.length);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('replaceRoutes failed', { sourceId, error });
      return err(ERRORS.DATABASE_ERROR);
    } finally {
      client.release();
    }
  }
}

export const RoadRepository: IRoadRepository = new RoadRepositoryImpl();
