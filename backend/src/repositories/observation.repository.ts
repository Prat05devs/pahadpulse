import { err, ok, type Result } from 'neverthrow';

import { db } from '../database/db.js';
import { bulkValues, excludedSet } from '../database/sql.js';
import {
  FORECASTS_TABLE,
  OBSERVATIONS_TABLE,
  STATIONS_TABLE,
  toStation,
  type ForecastRow,
  type ObservationRow,
  type Station,
  type StationRow,
} from '../models/observation.model.js';
import { Metric, StationType } from '../types/hydromet.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';

const logger = createLogger('@observation.repository');

const STATION_SELECT = `
  SELECT s.id, s.source_id, s.source_station_code, s.type, s.name_en, s.name_hi,
         s.area_id,
         -- The column is a geography(Point); the model still wants a lat/lng pair, so it
         -- is projected here rather than reshaping every consumer.
         ST_Y(s.location::geometry) AS lat,
         ST_X(s.location::geometry) AS lng,
         s.river_name, s.is_active
    FROM ${STATIONS_TABLE} s
`;

/** One measurement, as the connector produces it. Timestamps are MySQL UTC strings. */
export interface ObservationInput {
  stationId: number;
  metric: Metric;
  observedAt: string;
  value: number;
  unit: string;
  sourceId: number;
}

export interface ForecastInput {
  areaId: number;
  metric: Metric;
  validFrom: string;
  validTo: string;
  value: number;
  unit: string;
  sourceId: number;
}

/** A station with the slug of the area it reports for, so a batch read needs no second query. */
export interface StationWithArea {
  station: Station;
  areaSlug: string;
  areaNameEn: string;
  areaNameHi: string | null;
}

export interface IObservationRepository {
  listActiveStations(type: StationType): Promise<Result<Station[], RequestError>>;
  /** Every active station of a type, joined to its area. One query for the whole state. */
  listActiveStationsWithArea(type: StationType): Promise<Result<StationWithArea[], RequestError>>;
  /**
   * The latest reading per (station, metric) for MANY stations at once.
   *
   * The single-station version exists for the district page, which genuinely wants one.
   * This exists because the state-wide pages wanted thirteen and were making thirteen HTTP
   * requests, each running three queries, to get them.
   */
  latestForStations(
    stationIds: readonly number[],
    metrics: readonly Metric[],
  ): Promise<Result<ObservationRow[], RequestError>>;
  findStationForArea(areaId: number, type: StationType): Promise<Result<Station, RequestError>>;
  /** HYD-1: upserts by (station, metric, observed_at). Safe to re-run (DS-5). */
  upsertObservations(inputs: readonly ObservationInput[]): Promise<Result<number, RequestError>>;
  latestForStation(
    stationId: number,
    metrics: readonly Metric[],
  ): Promise<Result<ObservationRow[], RequestError>>;
  replaceForecasts(
    areaId: number,
    sourceId: number,
    inputs: readonly ForecastInput[],
  ): Promise<Result<number, RequestError>>;
  forecastForArea(areaId: number): Promise<Result<ForecastRow[], RequestError>>;
}

class ObservationRepositoryImpl implements IObservationRepository {
  async listActiveStationsWithArea(
    type: StationType,
  ): Promise<Result<StationWithArea[], RequestError>> {
    try {
      const { rows } = await db.query<StationRow & {
        area_slug: string;
        area_name_en: string;
        area_name_hi: string | null;
      }>(
        `SELECT s.id, s.source_id, s.source_station_code, s.type, s.name_en, s.name_hi,
                s.area_id,
                ST_Y(s.location::geometry) AS lat,
                ST_X(s.location::geometry) AS lng,
                s.river_name, s.is_active,
                a.slug AS area_slug, a.name_en AS area_name_en, a.name_hi AS area_name_hi
           FROM ${STATIONS_TABLE} s
           JOIN areas a ON a.id = s.area_id
          WHERE s.type = $1 AND s.is_active = TRUE
          ORDER BY a.name_en ASC`,
        [type],
      );

      return ok(
        rows.map((row) => ({
          station: toStation(row),
          areaSlug: row.area_slug,
          areaNameEn: row.area_name_en,
          areaNameHi: row.area_name_hi,
        })),
      );
    } catch (error) {
      logger.error('listActiveStationsWithArea failed', { type, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /**
   * The latest reading per (station, metric) across many stations.
   *
   * `DISTINCT ON` rather than the correlated subquery the single-station version uses: for
   * one station the subquery is an index seek, but running it per row across thirteen
   * stations and eight metrics is a hundred seeks. `DISTINCT ON (station_id, metric)` with
   * a matching ORDER BY walks `idx_obs_station_metric_time` once and takes the first row of
   * each group — one pass, and the index is already ordered the right way.
   */
  async latestForStations(
    stationIds: readonly number[],
    metrics: readonly Metric[],
  ): Promise<Result<ObservationRow[], RequestError>> {
    if (stationIds.length === 0 || metrics.length === 0) return ok([]);

    try {
      const { rows } = await db.query<ObservationRow>(
        `SELECT DISTINCT ON (o.station_id, o.metric)
                o.station_id, o.metric, o.observed_at, o.value, o.unit, o.source_id, o.fetched_at
           FROM ${OBSERVATIONS_TABLE} o
          WHERE o.station_id = ANY($1::integer[])
            AND o.metric = ANY($2::metric[])
          ORDER BY o.station_id, o.metric, o.observed_at DESC`,
        [[...stationIds], [...metrics]],
      );
      return ok(rows);
    } catch (error) {
      logger.error('latestForStations failed', { count: stationIds.length, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listActiveStations(type: StationType): Promise<Result<Station[], RequestError>> {
    try {
      const { rows } = await db.query<StationRow>(
        `${STATION_SELECT} WHERE s.type = $1 AND s.is_active = TRUE ORDER BY s.id`,
        [type],
      );
      return ok(rows.map(toStation));
    } catch (error) {
      logger.error('listActiveStations failed', { type, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async findStationForArea(
    areaId: number,
    type: StationType,
  ): Promise<Result<Station, RequestError>> {
    try {
      const { rows } = await db.query<StationRow>(
        `${STATION_SELECT} WHERE s.area_id = $1 AND s.type = $2 AND s.is_active = TRUE
          ORDER BY s.id LIMIT 1`,
        [areaId, type],
      );
      const row = rows[0];
      if (row === undefined) return err(ERRORS.STATION_NOT_FOUND);
      return ok(toStation(row));
    } catch (error) {
      logger.error('findStationForArea failed', { areaId, type, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /**
   * One multi-row INSERT rather than a statement per reading: an hourly run writes 13
   * stations x 6 metrics, and 78 round trips to do the work of one is the kind of thing
   * that makes a cron look like an outage.
   */
  async upsertObservations(
    inputs: readonly ObservationInput[],
  ): Promise<Result<number, RequestError>> {
    if (inputs.length === 0) return ok(0);

    try {
      const { text, params } = bulkValues(
        inputs.map((input) => [
          input.stationId,
          input.metric,
          input.observedAt,
          input.value,
          input.unit,
          input.sourceId,
        ]),
      );

      await db.query(
        `INSERT INTO ${OBSERVATIONS_TABLE}
           (station_id, metric, observed_at, value, unit, source_id)
         VALUES ${text}
         ON CONFLICT (station_id, metric, observed_at) DO UPDATE SET
           ${excludedSet(['value', 'unit', 'source_id'])},
           fetched_at = (now() AT TIME ZONE 'utc')`,
        params,
      );

      return ok(inputs.length);
    } catch (error) {
      logger.error('upsertObservations failed', { count: inputs.length, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /**
   * The newest reading per metric, in one query.
   *
   * The correlated subquery is the reason `idx_obs_station_metric_time` is ordered DESC:
   * each inner MAX is an index-backed lookup of one row, not a scan of the station's
   * history. The obvious alternative — fetch recent rows and reduce in TypeScript — reads
   * more of the table every day the series grows.
   */
  async latestForStation(
    stationId: number,
    metrics: readonly Metric[],
  ): Promise<Result<ObservationRow[], RequestError>> {
    if (metrics.length === 0) return ok([]);

    try {
      const { rows } = await db.query<ObservationRow>(
        `SELECT o.station_id, o.metric, o.observed_at, o.value, o.unit, o.source_id, o.fetched_at
           FROM ${OBSERVATIONS_TABLE} o
          WHERE o.station_id = $1
            AND o.metric = ANY($2::metric[])
            AND o.observed_at = (
              SELECT MAX(i.observed_at)
                FROM ${OBSERVATIONS_TABLE} i
               WHERE i.station_id = o.station_id AND i.metric = o.metric
            )`,
        [stationId, metrics],
      );
      return ok(rows);
    } catch (error) {
      logger.error('latestForStation failed', { stationId, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  /**
   * Forecasts are replaced wholesale for the area, never merged.
   *
   * A new run's seven days supersede the previous run's seven days completely. Merging
   * would leave yesterday's rows for days the new run no longer covers, and a stale
   * forecast that looks current is worse than no forecast — it is the one kind of staleness
   * a reader cannot detect for themselves.
   */
  async replaceForecasts(
    areaId: number,
    sourceId: number,
    inputs: readonly ForecastInput[],
  ): Promise<Result<number, RequestError>> {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Scoped to this source: another source's forecasts for the same area are not this
      // run's to discard (HYD-5 allows several, ordered).
      await client.query(
        `DELETE FROM ${FORECASTS_TABLE} WHERE area_id = $1 AND source_id = $2`,
        [areaId, sourceId],
      );

      if (inputs.length > 0) {
        const { text, params } = bulkValues(
          inputs.map((input) => [
            input.areaId,
            input.metric,
            input.validFrom,
            input.validTo,
            input.value,
            input.unit,
            input.sourceId,
          ]),
        );
        await client.query(
          `INSERT INTO ${FORECASTS_TABLE}
             (area_id, metric, valid_from, valid_to, value, unit, source_id)
           VALUES ${text}`,
          params,
        );
      }

      await client.query('COMMIT');
      return ok(inputs.length);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('replaceForecasts failed', { areaId, sourceId, error });
      return err(ERRORS.DATABASE_ERROR);
    } finally {
      client.release();
    }
  }

  async forecastForArea(areaId: number): Promise<Result<ForecastRow[], RequestError>> {
    try {
      const { rows } = await db.query<ForecastRow>(
        `SELECT f.area_id, f.metric, f.valid_from, f.valid_to, f.value, f.unit,
                f.source_id, f.fetched_at
           FROM ${FORECASTS_TABLE} f
          WHERE f.area_id = $1
            -- Past days are dropped at read time rather than deleted: the run that
            -- replaces them is the only thing that should write here.
            AND f.valid_to >= (now() AT TIME ZONE 'utc')
          ORDER BY f.valid_from ASC, f.metric ASC`,
        [areaId],
      );
      return ok(rows);
    } catch (error) {
      logger.error('forecastForArea failed', { areaId, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }
}

export const ObservationRepository: IObservationRepository = new ObservationRepositoryImpl();
