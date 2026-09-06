import { err, ok, type Result } from 'neverthrow';

import { db } from '../database/db.js';
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
         s.area_id, s.lat, s.lng, s.river_name, s.is_active
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

export interface IObservationRepository {
  listActiveStations(type: StationType): Promise<Result<Station[], RequestError>>;
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
  async listActiveStations(type: StationType): Promise<Result<Station[], RequestError>> {
    try {
      const [rows] = await db.query<StationRow[]>(
        `${STATION_SELECT} WHERE s.type = ? AND s.is_active = TRUE ORDER BY s.id`,
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
      const [rows] = await db.query<StationRow[]>(
        `${STATION_SELECT} WHERE s.area_id = ? AND s.type = ? AND s.is_active = TRUE
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
      const values = inputs.map((input) => [
        input.stationId,
        input.metric,
        input.observedAt,
        input.value,
        input.unit,
        input.sourceId,
      ]);

      await db.query(
        `INSERT INTO ${OBSERVATIONS_TABLE}
           (station_id, metric, observed_at, value, unit, source_id)
         VALUES ?
         AS new
         ON DUPLICATE KEY UPDATE
           value = new.value, unit = new.unit, source_id = new.source_id,
           fetched_at = UTC_TIMESTAMP()`,
        [values],
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
      const [rows] = await db.query<ObservationRow[]>(
        `SELECT o.station_id, o.metric, o.observed_at, o.value, o.unit, o.source_id, o.fetched_at
           FROM ${OBSERVATIONS_TABLE} o
          WHERE o.station_id = ?
            AND o.metric IN (?)
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
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Scoped to this source: another source's forecasts for the same area are not this
      // run's to discard (HYD-5 allows several, ordered).
      await connection.query(`DELETE FROM ${FORECASTS_TABLE} WHERE area_id = ? AND source_id = ?`, [
        areaId,
        sourceId,
      ]);

      if (inputs.length > 0) {
        const values = inputs.map((input) => [
          input.areaId,
          input.metric,
          input.validFrom,
          input.validTo,
          input.value,
          input.unit,
          input.sourceId,
        ]);
        await connection.query(
          `INSERT INTO ${FORECASTS_TABLE}
             (area_id, metric, valid_from, valid_to, value, unit, source_id)
           VALUES ?`,
          [values],
        );
      }

      await connection.commit();
      return ok(inputs.length);
    } catch (error) {
      await connection.rollback();
      logger.error('replaceForecasts failed', { areaId, sourceId, error });
      return err(ERRORS.DATABASE_ERROR);
    } finally {
      connection.release();
    }
  }

  async forecastForArea(areaId: number): Promise<Result<ForecastRow[], RequestError>> {
    try {
      const [rows] = await db.query<ForecastRow[]>(
        `SELECT f.area_id, f.metric, f.valid_from, f.valid_to, f.value, f.unit,
                f.source_id, f.fetched_at
           FROM ${FORECASTS_TABLE} f
          WHERE f.area_id = ?
            -- Past days are dropped at read time rather than deleted: the run that
            -- replaces them is the only thing that should write here.
            AND f.valid_to >= UTC_TIMESTAMP()
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
