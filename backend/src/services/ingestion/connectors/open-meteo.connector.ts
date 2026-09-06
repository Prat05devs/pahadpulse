import { err, ok, type Result } from 'neverthrow';

import { OPEN_METEO } from '../../../config/constants.js';
import {
  ObservationRepository,
  type ForecastInput,
  type ObservationInput,
} from '../../../repositories/observation.repository.js';
import { Metric, StationType } from '../../../types/hydromet.js';
import { ERRORS, type RequestError } from '../../../utils/errors.js';
import { fetchText } from '../../../utils/http.js';
import createLogger from '../../../utils/logger.js';
import type { ConnectorContext, ConnectorOutcome, SourceConnector } from '../connector.js';
import {
  localToUtc,
  parseOpenMeteoResponse,
  type OpenMeteoResponse,
} from './open-meteo.parser.js';

const logger = createLogger('@open-meteo.connector');

/**
 * Units are taken from our own request, not from the response.
 *
 * These are the defaults Open-Meteo documents for the fields we ask for, and the connector
 * asserts them rather than reading `current_units` back, so that a silent upstream unit
 * change becomes a wrong-looking number someone notices rather than a Fahrenheit reading
 * quietly relabelled °C in our own database. HYD-2 requires the unit to be stored; it does
 * not require us to believe whatever arrives.
 */
const UNITS = {
  [Metric.TemperatureC]: '°C',
  [Metric.TemperatureMinC]: '°C',
  [Metric.TemperatureMaxC]: '°C',
  [Metric.RainfallMm]: 'mm',
  [Metric.HumidityPct]: '%',
  [Metric.WindSpeedKmh]: 'km/h',
  [Metric.WindDirectionDeg]: '°',
  [Metric.WeatherCode]: 'wmo',
} as const satisfies Partial<Record<Metric, string>>;

interface StationOutcome {
  observations: number;
  forecastDays: number;
  failed: boolean;
}

/**
 * Open-Meteo — current conditions and a 7-day forecast, one request per district.
 *
 * This is the first connector on the platform that ingests MEASUREMENTS rather than
 * warnings. The alert sources speak CAP, which has no field for temperature or wind; see
 * migration 020 for why that gap needed a new source rather than more work on the old ones.
 *
 * One request per station rather than one batched request for all thirteen: Open-Meteo does
 * accept multiple coordinates in a single call, but the response then arrays everything and
 * a single malformed entry costs the whole state its weather. At 13 requests an hour
 * against a 10,000/day allowance, the isolation is close to free.
 *
 * A station that fails is logged and skipped, never fatal (DS-4): twelve districts with
 * weather beats thirteen without because one coordinate timed out.
 */
class OpenMeteoConnector implements SourceConnector {
  readonly sourceKey = 'open-meteo';
  readonly ownerModule = 'hydromet';
  readonly isAvailable = true;
  readonly unavailableReason = null;

  async fetch(context: ConnectorContext): Promise<Result<ConnectorOutcome, RequestError>> {
    const stations = await ObservationRepository.listActiveStations(StationType.Weather);
    if (stations.isErr()) return err(stations.error);

    if (stations.value.length === 0) {
      // Not a failure: migration 021 seeds the stations, so an empty registry means the
      // migration has not run rather than that the upstream is broken.
      return ok({
        rowsWritten: 0,
        rowsRejected: 0,
        vintage: null,
        notes: 'No active weather stations are registered; nothing to fetch.',
      });
    }

    let observations = 0;
    let forecastDays = 0;
    let failedStations = 0;

    for (const station of stations.value) {
      // Sequential, like the CAP connectors: thirteen parallel requests against a free
      // community API is exactly the behaviour that gets a client rate-limited.
      const outcome = await this.processStation(
        station.id,
        station.areaId,
        station.lat,
        station.lng,
        context,
      );

      if (outcome.failed) failedStations += 1;
      observations += outcome.observations;
      forecastDays += outcome.forecastDays;
    }

    // Every station failing is an upstream problem, not a partial success. Reporting it as
    // one would let a total outage sit behind a green freshness badge.
    if (failedStations === stations.value.length) {
      return err(ERRORS.UPSTREAM_UNAVAILABLE);
    }

    return ok({
      rowsWritten: observations + forecastDays,
      rowsRejected: 0,
      // What the data describes: the run's own day. Current conditions are by definition
      // about now, so unlike a census table there is no other vintage to report (DS-2).
      vintage: context.now.toISOString().slice(0, 10),
      notes:
        `${stations.value.length - failedStations}/${stations.value.length} station(s) updated; ` +
        `${observations} observation(s), ${forecastDays} forecast row(s).`,
    });
  }

  private async processStation(
    stationId: number,
    areaId: number,
    lat: number,
    lng: number,
    context: ConnectorContext,
  ): Promise<StationOutcome> {
    const url = this.buildUrl(lat, lng);

    const body = await fetchText(url, {
      timeoutMs: OPEN_METEO.FETCH_TIMEOUT_MS,
      retries: OPEN_METEO.FETCH_RETRIES,
    });
    if (body.isErr()) {
      logger.warn('failed to fetch Open-Meteo for a station', {
        stationId,
        code: body.error.code,
      });
      return { observations: 0, forecastDays: 0, failed: true };
    }

    const parsed = parseOpenMeteoResponse(body.value);
    if (parsed.isErr()) {
      logger.warn('failed to parse Open-Meteo for a station', { stationId });
      return { observations: 0, forecastDays: 0, failed: true };
    }

    const response = parsed.value;
    const offset = response.utc_offset_seconds;

    const observations = this.toObservations(response, stationId, offset, context.sourceId);
    const forecasts = this.toForecasts(response, areaId, offset, context.sourceId);

    const wroteObservations = await ObservationRepository.upsertObservations(observations);
    if (wroteObservations.isErr()) {
      logger.error('failed to write observations', { stationId });
      return { observations: 0, forecastDays: 0, failed: true };
    }

    const wroteForecasts = await ObservationRepository.replaceForecasts(
      areaId,
      context.sourceId,
      forecasts,
    );
    if (wroteForecasts.isErr()) {
      // The current conditions are already stored and are the panel's headline. Losing the
      // forecast degrades the panel; it does not invalidate the reading.
      logger.warn('failed to write forecasts; observations were still stored', { areaId });
      return { observations: wroteObservations.value, forecastDays: 0, failed: false };
    }

    return {
      observations: wroteObservations.value,
      forecastDays: wroteForecasts.value,
      failed: false,
    };
  }

  private buildUrl(lat: number, lng: number): string {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      current: OPEN_METEO.CURRENT_FIELDS.join(','),
      daily: OPEN_METEO.DAILY_FIELDS.join(','),
      timezone: OPEN_METEO.TIMEZONE,
      forecast_days: OPEN_METEO.FORECAST_DAYS.toString(),
    });
    return `${OPEN_METEO.FORECAST_URL}?${params.toString()}`;
  }

  /**
   * Null and absent fields are skipped, never defaulted. A missing humidity reading must
   * leave the panel with no humidity, not with 0% (HYD-6).
   */
  private toObservations(
    response: OpenMeteoResponse,
    stationId: number,
    offset: number,
    sourceId: number,
  ): ObservationInput[] {
    const current = response.current;
    if (current === undefined) return [];

    const observedAt = localToUtc(current.time, offset);
    if (observedAt === null) {
      logger.warn('Open-Meteo returned an unparseable current timestamp', {
        stationId,
        time: current.time,
      });
      return [];
    }

    const pairs: readonly (readonly [Metric, number | null | undefined])[] = [
      [Metric.TemperatureC, current.temperature_2m],
      [Metric.HumidityPct, current.relative_humidity_2m],
      [Metric.RainfallMm, current.precipitation],
      [Metric.WeatherCode, current.weather_code],
      [Metric.WindSpeedKmh, current.wind_speed_10m],
      [Metric.WindDirectionDeg, current.wind_direction_10m],
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
    return rows;
  }

  private toForecasts(
    response: OpenMeteoResponse,
    areaId: number,
    offset: number,
    sourceId: number,
  ): ForecastInput[] {
    const daily = response.daily;
    if (daily === undefined) return [];

    const rows: ForecastInput[] = [];

    daily.time.forEach((day, index) => {
      const validFrom = localToUtc(day, offset);
      if (validFrom === null) return;

      // A local day is 24 hours after its local midnight, expressed in UTC. Derived from
      // validFrom rather than from the next array entry so the last day of the forecast
      // gets a real window instead of an open-ended one.
      const validTo = new Date(new Date(`${validFrom.replace(' ', 'T')}Z`).getTime() + 86_400_000)
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d+Z$/, '');

      const pairs: readonly (readonly [Metric, number | null | undefined])[] = [
        [Metric.TemperatureMinC, daily.temperature_2m_min?.[index]],
        [Metric.TemperatureMaxC, daily.temperature_2m_max?.[index]],
        [Metric.RainfallMm, daily.precipitation_sum?.[index]],
        [Metric.WeatherCode, daily.weather_code?.[index]],
      ];

      for (const [metric, value] of pairs) {
        if (value === null || value === undefined) continue;
        rows.push({
          areaId,
          metric,
          validFrom,
          validTo,
          value,
          unit: UNITS[metric as keyof typeof UNITS],
          sourceId,
        });
      }
    });

    return rows;
  }
}

export const openMeteoConnector: SourceConnector = new OpenMeteoConnector();
