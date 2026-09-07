import { err, ok, type Result } from 'neverthrow';
import { z } from 'zod';

import { OPEN_METEO_AIR } from '../../../config/constants.js';
import {
  ObservationRepository,
  type ObservationInput,
} from '../../../repositories/observation.repository.js';
import { Metric, StationType } from '../../../types/hydromet.js';
import { ERRORS, type RequestError } from '../../../utils/errors.js';
import { fetchText } from '../../../utils/http.js';
import createLogger from '../../../utils/logger.js';
import type { ConnectorContext, ConnectorOutcome, SourceConnector } from '../connector.js';
import { localToUtc } from './open-meteo.parser.js';

const logger = createLogger('@open-meteo-air.connector');

/**
 * Validated at the boundary (N5). Every pollutant is nullable: CAMS does not model every
 * species everywhere, and a null coerced to 0 would publish "no particulate pollution in
 * Pithoragarh" as a finding.
 */
const AirCurrentSchema = z.object({
  time: z.string().min(1),
  pm10: z.number().nullable().optional(),
  pm2_5: z.number().nullable().optional(),
  carbon_monoxide: z.number().nullable().optional(),
  nitrogen_dioxide: z.number().nullable().optional(),
  sulphur_dioxide: z.number().nullable().optional(),
  ozone: z.number().nullable().optional(),
  us_aqi: z.number().nullable().optional(),
});

/**
 * The hourly series behind the National AQI. Open-Meteo returns parallel arrays: `time[i]`
 * describes the same hour as `pm2_5[i]`, so they are validated as arrays of equal intent and
 * zipped by index below.
 */
const AirHourlySchema = z.object({
  time: z.array(z.string()),
  pm10: z.array(z.number().nullable()).optional(),
  pm2_5: z.array(z.number().nullable()).optional(),
  carbon_monoxide: z.array(z.number().nullable()).optional(),
  nitrogen_dioxide: z.array(z.number().nullable()).optional(),
  sulphur_dioxide: z.array(z.number().nullable()).optional(),
  ozone: z.array(z.number().nullable()).optional(),
});

type AirHourly = z.infer<typeof AirHourlySchema>;
/** The pollutant array names on the hourly payload — `time` is handled separately. */
type HourlyField = Exclude<keyof AirHourly, 'time'>;

const AirResponseSchema = z.object({
  utc_offset_seconds: z.number(),
  current: AirCurrentSchema.optional(),
  hourly: AirHourlySchema.optional(),
});

const UNITS = {
  [Metric.Pm25]: 'µg/m³',
  [Metric.Pm10]: 'µg/m³',
  [Metric.UsAqi]: 'usaqi',
  [Metric.NitrogenDioxide]: 'µg/m³',
  [Metric.Ozone]: 'µg/m³',
  [Metric.SulphurDioxide]: 'µg/m³',
  [Metric.CarbonMonoxide]: 'µg/m³',
} as const satisfies Partial<Record<Metric, string>>;

/**
 * Air quality for every district, from Copernicus CAMS via Open-Meteo.
 *
 * Deliberately a SEPARATE connector from `open-meteo`, not another field on it. It is a
 * different API with a different upstream model, and separating them means an air-quality
 * outage degrades the air panel while temperature keeps updating — one source going quiet
 * should never take the other's freshness badge down with it (DS-3).
 *
 * It writes to the same stations, because they are the same places.
 */
class OpenMeteoAirConnector implements SourceConnector {
  readonly sourceKey = 'open-meteo-air-quality';
  readonly ownerModule = 'hydromet';
  readonly isAvailable = true;
  readonly unavailableReason = null;

  async fetch(context: ConnectorContext): Promise<Result<ConnectorOutcome, RequestError>> {
    const stations = await ObservationRepository.listActiveStations(StationType.Weather);
    if (stations.isErr()) return err(stations.error);

    if (stations.value.length === 0) {
      return ok({
        rowsWritten: 0,
        rowsRejected: 0,
        vintage: null,
        notes: 'No active stations are registered; nothing to fetch.',
      });
    }

    let written = 0;
    let failed = 0;

    for (const station of stations.value) {
      const rows = await this.fetchStation(station.id, station.lat, station.lng, context.sourceId);
      if (rows === null) {
        failed += 1;
        continue;
      }

      const stored = await ObservationRepository.upsertObservations(rows);
      if (stored.isErr()) {
        failed += 1;
        continue;
      }
      written += stored.value;
    }

    if (failed === stations.value.length) return err(ERRORS.UPSTREAM_UNAVAILABLE);

    return ok({
      rowsWritten: written,
      rowsRejected: 0,
      vintage: context.now.toISOString().slice(0, 10),
      notes: `${stations.value.length - failed}/${stations.value.length} station(s) updated; ${written} reading(s).`,
    });
  }

  private async fetchStation(
    stationId: number,
    lat: number,
    lng: number,
    sourceId: number,
  ): Promise<ObservationInput[] | null> {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      current: OPEN_METEO_AIR.CURRENT_FIELDS.join(','),
      // The hourly series is what makes a CPCB 24-hour average possible at all.
      hourly: OPEN_METEO_AIR.HOURLY_FIELDS.join(','),
      past_days: OPEN_METEO_AIR.PAST_DAYS.toString(),
      timezone: OPEN_METEO_AIR.TIMEZONE,
    });

    const body = await fetchText(`${OPEN_METEO_AIR.URL}?${params.toString()}`, {
      timeoutMs: OPEN_METEO_AIR.FETCH_TIMEOUT_MS,
      retries: OPEN_METEO_AIR.FETCH_RETRIES,
    });
    if (body.isErr()) {
      logger.warn('failed to fetch air quality', { stationId, code: body.error.code });
      return null;
    }

    let json: unknown;
    try {
      json = JSON.parse(body.value);
    } catch {
      logger.warn('air quality response was not JSON', { stationId });
      return null;
    }

    const parsed = AirResponseSchema.safeParse(json);
    if (!parsed.success) {
      logger.warn('air quality response did not match the expected schema', { stationId });
      return null;
    }

    const current = parsed.data.current;
    if (current === undefined) return [];

    // Same local-to-UTC correction as the weather connector: the response is IST
    // wall-clock with no offset attached, and the payload states its own offset.
    const observedAt = localToUtc(current.time, parsed.data.utc_offset_seconds);
    if (observedAt === null) {
      logger.warn('air quality timestamp was unparseable', { stationId, time: current.time });
      return null;
    }

    const pairs: readonly (readonly [Metric, number | null | undefined])[] = [
      [Metric.Pm25, current.pm2_5],
      [Metric.Pm10, current.pm10],
      [Metric.UsAqi, current.us_aqi],
      [Metric.NitrogenDioxide, current.nitrogen_dioxide],
      [Metric.Ozone, current.ozone],
      [Metric.SulphurDioxide, current.sulphur_dioxide],
      [Metric.CarbonMonoxide, current.carbon_monoxide],
    ];

    const rows: ObservationInput[] = [];
    for (const [metric, value] of pairs) {
      if (value === null || value === undefined) continue;
      rows.push({
        stationId,
        metric,
        observedAt,
        value,
        unit: UNITS[metric as keyof typeof UNITS],
        sourceId,
      });
    }

    rows.push(
      ...this.hourlyRows(parsed.data.hourly, parsed.data.utc_offset_seconds, stationId, sourceId),
    );

    return rows;
  }

  /**
   * The hourly series flattened into observations.
   *
   * These share the primary key with the `current` rows they overlap, so the newest hour
   * arrives twice in one run and simply upserts — the same property that makes the whole
   * cron safe to re-run (DS-5). A future hour is skipped: Open-Meteo's hourly array runs
   * past `now` into its forecast, and a forecast stored as an observation would quietly
   * corrupt every average computed over it.
   */
  private hourlyRows(
    hourly: AirHourly | undefined,
    utcOffsetSeconds: number,
    stationId: number,
    sourceId: number,
  ): ObservationInput[] {
    if (hourly === undefined) return [];

    const rows: ObservationInput[] = [];
    const nowMs = Date.now();

    const series: ReadonlyArray<readonly [Metric, HourlyField]> = [
      [Metric.Pm25, 'pm2_5'],
      [Metric.Pm10, 'pm10'],
      [Metric.NitrogenDioxide, 'nitrogen_dioxide'],
      [Metric.Ozone, 'ozone'],
      [Metric.SulphurDioxide, 'sulphur_dioxide'],
      [Metric.CarbonMonoxide, 'carbon_monoxide'],
    ];

    for (let index = 0; index < hourly.time.length; index += 1) {
      const stamp = hourly.time[index];
      if (stamp === undefined) continue;

      const observedAt = localToUtc(stamp, utcOffsetSeconds);
      if (observedAt === null) continue;
      if (new Date(`${observedAt.replace(' ', 'T')}Z`).getTime() > nowMs) continue;

      for (const [metric, field] of series) {
        const values = hourly[field];
        if (values === undefined) continue;
        const value = values[index];
        if (typeof value !== 'number') continue;
        rows.push({
          stationId,
          metric,
          observedAt,
          value,
          unit: UNITS[metric as keyof typeof UNITS],
          sourceId,
        });
      }
    }

    return rows;
  }

}

export const openMeteoAirConnector: SourceConnector = new OpenMeteoAirConnector();
