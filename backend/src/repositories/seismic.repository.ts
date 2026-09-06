import { err, ok, type Result } from 'neverthrow';

import { db } from '../database/db.js';
import { excludedSet } from '../database/sql.js';
import {
  SEISMIC_EVENTS_TABLE,
  toSeismicEvent,
  type SeismicEvent,
  type SeismicEventRow,
} from '../models/seismic.model.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';

const logger = createLogger('@seismic.repository');

const SELECT = `
  SELECT e.id, e.source_id, e.source_event_id, e.magnitude, e.magnitude_type, e.depth_km,
         e.place,
         -- Projected from the geography(Point) column back to the pair the model expects.
         ST_Y(e.epicentre::geometry) AS lat,
         ST_X(e.epicentre::geometry) AS lng,
         e.occurred_at, e.review_status, e.web_url, e.fetched_at
    FROM ${SEISMIC_EVENTS_TABLE} e
`;

export interface UpsertSeismicInput {
  sourceId: number;
  sourceEventId: string;
  magnitude: number;
  magnitudeType: string | null;
  depthKm: number | null;
  place: string;
  lat: number;
  lng: number;
  occurredAt: string;
  reviewStatus: string | null;
  webUrl: string | null;
}

export interface ISeismicRepository {
  /** Upserts by (source, event id) — a USGS revision replaces our row (DS-5). */
  upsertMany(inputs: readonly UpsertSeismicInput[]): Promise<Result<number, RequestError>>;
  listRecent(limit: number, minMagnitude?: number): Promise<Result<SeismicEvent[], RequestError>>;
  countSince(since: string): Promise<Result<number, RequestError>>;
}

class SeismicRepositoryImpl implements ISeismicRepository {
  async upsertMany(
    inputs: readonly UpsertSeismicInput[],
  ): Promise<Result<number, RequestError>> {
    if (inputs.length === 0) return ok(0);

    try {
      /*
       * Built explicitly rather than through `bulkValues`, because one column is not a
       * plain parameter: `epicentre` is a constructed point, so its tuple slot has to be
       * `ST_MakePoint(...)` wrapping two placeholders rather than a placeholder itself.
       *
       * ST_MakePoint takes X then Y — longitude before latitude. Passing them the other
       * way round puts every Himalayan earthquake in the Indian Ocean and raises no error,
       * so the order is stated here and asserted in the repository test.
       */
      const params: unknown[] = [];
      const tuples: string[] = [];

      for (const input of inputs) {
        const base = params.length;
        params.push(
          input.sourceId,
          input.sourceEventId,
          input.magnitude,
          input.magnitudeType,
          input.depthKm,
          input.place,
          input.lng,
          input.lat,
          input.occurredAt,
          input.reviewStatus,
          input.webUrl,
        );
        const p = (offset: number) => `$${base + offset}`;
        tuples.push(
          `(${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ` +
            `ST_SetSRID(ST_MakePoint(${p(7)}, ${p(8)}), 4326)::geography, ` +
            `${p(9)}, ${p(10)}, ${p(11)})`,
        );
      }

      // One multi-row statement: a 90-day window can return a few hundred events and a
      // statement each would turn a quick run into a long one.
      await db.query(
        `INSERT INTO ${SEISMIC_EVENTS_TABLE}
           (source_id, source_event_id, magnitude, magnitude_type, depth_km, place,
            epicentre, occurred_at, review_status, web_url)
         VALUES ${tuples.join(', ')}
         ON CONFLICT (source_id, source_event_id) DO UPDATE SET
           ${excludedSet([
             'magnitude',
             'magnitude_type',
             'depth_km',
             'place',
             'epicentre',
             'occurred_at',
             'review_status',
             'web_url',
           ])},
           fetched_at = (now() AT TIME ZONE 'utc')`,
        params,
      );

      return ok(inputs.length);
    } catch (error) {
      logger.error('upsertMany failed', { count: inputs.length, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listRecent(
    limit: number,
    minMagnitude?: number,
  ): Promise<Result<SeismicEvent[], RequestError>> {
    try {
      const conditions: string[] = [];
      const params: number[] = [];

      if (minMagnitude !== undefined) {
        conditions.push(`e.magnitude >= $${params.length + 1}`);
        params.push(minMagnitude);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      params.push(limit);

      const { rows } = await db.query<SeismicEventRow>(
        `${SELECT} ${where} ORDER BY e.occurred_at DESC LIMIT $${params.length}`,
        params,
      );

      // Rows with an unconvertible timestamp are dropped, not emitted — see toSeismicEvent.
      return ok(rows.map(toSeismicEvent).filter((event): event is SeismicEvent => event !== null));
    } catch (error) {
      logger.error('listRecent failed', { error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async countSince(since: string): Promise<Result<number, RequestError>> {
    try {
      const { rows } = await db.query<SeismicEventRow & { total: number }>(
        `SELECT COUNT(*) AS total FROM ${SEISMIC_EVENTS_TABLE} WHERE occurred_at >= $1`,
        [since],
      );
      return ok(rows[0]?.total ?? 0);
    } catch (error) {
      logger.error('countSince failed', { error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }
}

export const SeismicRepository: ISeismicRepository = new SeismicRepositoryImpl();
