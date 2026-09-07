import { err, ok, type Result } from 'neverthrow';

import {
  classifyAqi,
  toCondition,
  toObservation,
  type AreaAirQuality,
  type AreaWeather,
  type ConditionOut,
  type ForecastDay,
  type Observation,
} from '../models/observation.model.js';
import { AreaRepository } from '../repositories/area.repository.js';
import { ObservationRepository } from '../repositories/observation.repository.js';
import { SourceRepository } from '../repositories/source.repository.js';
import { Metric, StationType } from '../types/hydromet.js';
import { toIsoUtc } from '../utils/datetime.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import {
  AVERAGING_HOURS,
  computeNationalAqi,
  withAdequateCoverage,
} from '../models/cpcb-aqi.js';

/** The pollutants the air quality panel reads. */
const AIR_METRICS: readonly Metric[] = [
  Metric.UsAqi,
  Metric.Pm25,
  Metric.Pm10,
  Metric.NitrogenDioxide,
  Metric.Ozone,
  Metric.SulphurDioxide,
  Metric.CarbonMonoxide,
];

/** The metrics the district panel reads. Ordered only for a stable query plan. */
const PANEL_METRICS: readonly Metric[] = [
  Metric.TemperatureC,
  Metric.RainfallMm,
  Metric.HumidityPct,
  Metric.WindSpeedKmh,
  Metric.WindDirectionDeg,
  Metric.WeatherCode,
];

/**
 * Uttarakhand is IST year round, with no daylight saving.
 *
 * Hardcoded rather than read from a library because this product covers exactly one state,
 * and a forecast "day" here means a day as the reader lives it.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * The local calendar date a forecast row belongs to.
 *
 * `valid_from` is stored in UTC, and a local day begins at 18:30 UTC the PREVIOUS day —
 * so slicing the UTC date straight off would label every forecast day one day early, which
 * is exactly what it did before this was corrected. The offset is added back before the
 * date is taken so the label matches the day the reader is planning for.
 */
export function forecastDateKey(validFromIso: string): string {
  const localMs = new Date(validFromIso).getTime() + IST_OFFSET_MS;
  return new Date(localMs).toISOString().slice(0, 10);
}

/**
 * Current conditions and the daily forecast for one area.
 *
 * DS-6 is enforced here rather than in the UI: if the source may not be redistributed, this
 * returns "not available" and emits nothing. A weather panel is precisely the surface where
 * a licence breach would be invisible, so the API never hands out values it may not publish
 * and trusts the client to hide them.
 *
 * Every absence is reported as an absence, never as a zero (HYD-6). A district whose
 * ingestion has not run yet gets OBSERVATION_NOT_AVAILABLE, which the web app already
 * catches — the panel stays hidden rather than showing 0°C.
 */
export async function getAreaWeather(
  areaSlug: string,
  now: Date = new Date(),
): Promise<Result<AreaWeather, RequestError>> {
  const area = await AreaRepository.findBySlug(areaSlug);
  if (area.isErr()) return err(area.error);

  const station = await ObservationRepository.findStationForArea(
    area.value.id,
    StationType.Weather,
  );
  if (station.isErr()) return err(station.error);

  const sources = await SourceRepository.findByIds([station.value.sourceId], now);
  if (sources.isErr()) return err(sources.error);

  const source = sources.value.get(station.value.sourceId);
  // A station whose source is not in the registry cannot name where its numbers came
  // from, so it is not displayed (DS-1).
  if (source === undefined) return err(ERRORS.SOURCE_NOT_FOUND);
  if (!source.mayRedistribute) return err(ERRORS.SOURCE_NOT_REDISTRIBUTABLE);

  const latest = await ObservationRepository.latestForStation(station.value.id, PANEL_METRICS);
  if (latest.isErr()) return err(latest.error);

  const byMetric = new Map<Metric, Observation>();
  for (const row of latest.value) {
    const observation = toObservation(row);
    // A row with an unconvertible timestamp is dropped rather than emitted with a
    // fabricated one — see toObservation.
    if (observation !== null) byMetric.set(row.metric, observation);
  }

  if (byMetric.size === 0) return err(ERRORS.OBSERVATION_NOT_AVAILABLE);

  const weatherCode = byMetric.get(Metric.WeatherCode);
  const condition: ConditionOut | null =
    weatherCode === undefined ? null : toCondition(weatherCode.value);

  // The newest instant any of these metrics describes. They are written by one run and so
  // normally share a timestamp; the max is taken anyway rather than assumed, because a
  // partially failed run legitimately leaves them a step apart.
  const observedAt =
    [...byMetric.values()].map((observation) => observation.observedAt).sort().at(-1) ?? null;

  const forecast = await buildForecast(area.value.id);
  if (forecast.isErr()) return err(forecast.error);

  return ok({
    station: station.value,
    temperature: byMetric.get(Metric.TemperatureC),
    rainfall: byMetric.get(Metric.RainfallMm),
    humidity: byMetric.get(Metric.HumidityPct),
    wind: byMetric.get(Metric.WindSpeedKmh),
    windDirection: byMetric.get(Metric.WindDirectionDeg),
    condition,
    observedAt,
    forecast: forecast.value,
    source: {
      id: station.value.sourceId,
      key: source.key,
      department: source.department,
      attribution: source.attribution,
    },
  });
}

/**
 * Pivots the forecast rows — one per (day, metric) — into one entry per day.
 *
 * Stored long and read wide on purpose: the table holds any metric a source chooses to
 * forecast, while the panel wants a row per day. Doing the pivot here keeps that choice
 * out of the schema.
 */
async function buildForecast(areaId: number): Promise<Result<ForecastDay[], RequestError>> {
  const rows = await ObservationRepository.forecastForArea(areaId);
  if (rows.isErr()) return err(rows.error);

  const days = new Map<string, ForecastDay>();

  for (const row of rows.value) {
    const iso = toIsoUtc(row.valid_from);
    if (iso === null) continue;

    const key = forecastDateKey(iso);
    const day: ForecastDay = days.get(key) ?? {
      date: key,
      minTemperatureC: null,
      maxTemperatureC: null,
      precipitationMm: null,
      condition: null,
    };

    const value = Number(row.value);

    switch (row.metric) {
      case Metric.TemperatureMinC:
        day.minTemperatureC = value;
        break;
      case Metric.TemperatureMaxC:
        day.maxTemperatureC = value;
        break;
      case Metric.RainfallMm:
        day.precipitationMm = value;
        break;
      case Metric.WeatherCode:
        day.condition = toCondition(value);
        break;
      default:
        break;
    }

    days.set(key, day);
  }

  return ok([...days.values()].sort((a, b) => a.date.localeCompare(b.date)));
}

/** One district's entry in a state-wide batch response. */
export interface DistrictWeatherEntry {
  areaSlug: string;
  areaName: { en: string; hi: string | null };
  weather: AreaWeather | null;
}

export interface DistrictAirEntry {
  areaSlug: string;
  areaName: { en: string; hi: string | null };
  air: AreaAirQuality | null;
}

/**
 * Current conditions for every district, in one response.
 *
 * The districts page and the weather page each wanted thirteen of these and were fetching
 * them one HTTP request at a time — thirteen round trips, each running three queries, for
 * a page that renders them all together. This does the same work in three queries total:
 * the stations, their latest readings, and the source registry.
 *
 * A district whose ingestion has not run yet comes back with `weather: null` rather than
 * being omitted, so the caller still knows the district exists and can render it blank.
 * Dropping it would silently shorten the list.
 */
export async function getAllDistrictWeather(
  now: Date = new Date(),
): Promise<Result<DistrictWeatherEntry[], RequestError>> {
  const stations = await ObservationRepository.listActiveStationsWithArea(StationType.Weather);
  if (stations.isErr()) return err(stations.error);
  if (stations.value.length === 0) return ok([]);

  const stationIds = stations.value.map((entry) => entry.station.id);
  const readings = await ObservationRepository.latestForStations(stationIds, PANEL_METRICS);
  if (readings.isErr()) return err(readings.error);

  // Grouped by station once, rather than scanned per district inside the loop below.
  const byStation = new Map<number, Map<Metric, Observation>>();
  for (const row of readings.value) {
    const observation = toObservation(row);
    if (observation === null) continue;
    const forStation = byStation.get(row.station_id) ?? new Map<Metric, Observation>();
    forStation.set(row.metric, observation);
    byStation.set(row.station_id, forStation);
  }

  const sourceIds = [...new Set(stations.value.map((entry) => entry.station.sourceId))];
  const sources = await SourceRepository.findByIds(sourceIds, now);
  if (sources.isErr()) return err(sources.error);

  const entries: DistrictWeatherEntry[] = [];

  for (const { station, areaSlug, areaNameEn, areaNameHi } of stations.value) {
    const areaName = { en: areaNameEn, hi: areaNameHi };
    const byMetric = byStation.get(station.id);
    const source = sources.value.get(station.sourceId);

    // DS-1/DS-6 apply here exactly as they do on the single-district endpoint: no source in
    // the registry, or one we may not republish, emits nothing rather than a bare number.
    if (byMetric === undefined || source === undefined || !source.mayRedistribute) {
      entries.push({ areaSlug, areaName, weather: null });
      continue;
    }

    const weatherCode = byMetric.get(Metric.WeatherCode);
    const observedAt =
      [...byMetric.values()].map((observation) => observation.observedAt).sort().at(-1) ?? null;

    entries.push({
      areaSlug,
      areaName,
      weather: {
        station,
        temperature: byMetric.get(Metric.TemperatureC),
        rainfall: byMetric.get(Metric.RainfallMm),
        humidity: byMetric.get(Metric.HumidityPct),
        wind: byMetric.get(Metric.WindSpeedKmh),
        windDirection: byMetric.get(Metric.WindDirectionDeg),
        condition: weatherCode === undefined ? null : toCondition(weatherCode.value),
        observedAt,
        // Deliberately empty: the forecast is per-area and would be thirteen more queries
        // for data no state-wide view shows. The single-district endpoint still carries it.
        forecast: [],
        source: {
          id: station.sourceId,
          key: source.key,
          department: source.department,
          attribution: source.attribution,
        },
      },
    });
  }

  return ok(entries);
}

/** Air quality for every district, in one response. Same shape and rules as the weather batch. */
export async function getAllDistrictAirQuality(
  now: Date = new Date(),
): Promise<Result<DistrictAirEntry[], RequestError>> {
  const stations = await ObservationRepository.listActiveStationsWithArea(StationType.Weather);
  if (stations.isErr()) return err(stations.error);
  if (stations.value.length === 0) return ok([]);

  const stationIds = stations.value.map((entry) => entry.station.id);
  const readings = await ObservationRepository.latestForStations(stationIds, AIR_METRICS);
  if (readings.isErr()) return err(readings.error);

  const byStation = new Map<number, Map<Metric, Observation>>();
  // The air readings carry their OWN source id, which is not the station's — the station was
  // registered by the weather connector, these values came from the air-quality one.
  const airSourceByStation = new Map<number, number>();

  for (const row of readings.value) {
    const observation = toObservation(row);
    if (observation === null) continue;
    const forStation = byStation.get(row.station_id) ?? new Map<Metric, Observation>();
    forStation.set(row.metric, observation);
    byStation.set(row.station_id, forStation);
    airSourceByStation.set(row.station_id, observation.sourceId);
  }

  const sourceIds = [...new Set(airSourceByStation.values())];
  const sources = await SourceRepository.findByIds(sourceIds, now);
  if (sources.isErr()) return err(sources.error);

  const entries: DistrictAirEntry[] = [];

  /*
   * National AQI for every station in one query — see the note in `getAreaAirQuality` for
   * why this is computed rather than taken from the source. Degrades to an empty map, which
   * simply yields `nationalAqi: null` per district.
   */
  const averageRows = await ObservationRepository.pollutantAveragesForStations(
    stations.value.map((entry) => entry.station.id),
    AQI_WINDOWS,
  );
  const averagesByStation = new Map<number, Array<{ metric: Metric; average: number; sampleCount: number }>>();
  if (averageRows.isOk()) {
    for (const row of averageRows.value) {
      const list = averagesByStation.get(row.station_id) ?? [];
      list.push({ metric: row.metric, average: row.average, sampleCount: row.sample_count });
      averagesByStation.set(row.station_id, list);
    }
  }

  for (const { station, areaSlug, areaNameEn, areaNameHi } of stations.value) {
    const areaName = { en: areaNameEn, hi: areaNameHi };
    const byMetric = byStation.get(station.id);
    const sourceId = airSourceByStation.get(station.id);
    const source = sourceId === undefined ? undefined : sources.value.get(sourceId);

    if (byMetric === undefined || source === undefined || !source.mayRedistribute) {
      entries.push({ areaSlug, areaName, air: null });
      continue;
    }

    const aqi = byMetric.get(Metric.UsAqi);
    const observedAt =
      [...byMetric.values()].map((observation) => observation.observedAt).sort().at(-1) ?? null;

    entries.push({
      areaSlug,
      areaName,
      air: {
        station,
        aqi: aqi === undefined ? null : { value: aqi.value, band: classifyAqi(aqi.value) },
        nationalAqi: computeNationalAqi(
          withAdequateCoverage(averagesByStation.get(station.id) ?? []),
        ),
        pm25: byMetric.get(Metric.Pm25),
        pm10: byMetric.get(Metric.Pm10),
        nitrogenDioxide: byMetric.get(Metric.NitrogenDioxide),
        ozone: byMetric.get(Metric.Ozone),
        sulphurDioxide: byMetric.get(Metric.SulphurDioxide),
        carbonMonoxide: byMetric.get(Metric.CarbonMonoxide),
        observedAt,
        source: {
          id: sourceId ?? station.sourceId,
          key: source.key,
          department: source.department,
          attribution: source.attribution,
        },
      },
    });
  }

  return ok(entries);
}

/**
 * Air quality for one area.
 *
 * A separate endpoint from `/weather` rather than more fields on it, mirroring the split on
 * the ingestion side: the two come from different upstream models and either can be stale
 * while the other is current. Merging them would force one freshness state onto both.
 */
/** The averaging windows the National AQI is defined over, as the repository wants them. */
const AQI_WINDOWS = Object.entries(AVERAGING_HOURS).map(([metric, hours]) => ({
  metric: metric as Metric,
  hours,
}));

export async function getAreaAirQuality(
  areaSlug: string,
  now: Date = new Date(),
): Promise<Result<AreaAirQuality, RequestError>> {
  const area = await AreaRepository.findBySlug(areaSlug);
  if (area.isErr()) return err(area.error);

  const station = await ObservationRepository.findStationForArea(
    area.value.id,
    StationType.Weather,
  );
  if (station.isErr()) return err(station.error);

  const latest = await ObservationRepository.latestForStation(station.value.id, AIR_METRICS);
  if (latest.isErr()) return err(latest.error);

  const byMetric = new Map<Metric, Observation>();
  let airSourceId: number | null = null;

  for (const row of latest.value) {
    const observation = toObservation(row);
    if (observation === null) continue;
    byMetric.set(row.metric, observation);
    // The air rows carry their own source id, which is NOT the station's source: the
    // station was registered by the weather connector, the readings came from the air one.
    airSourceId = observation.sourceId;
  }

  if (byMetric.size === 0) return err(ERRORS.AIR_QUALITY_NOT_AVAILABLE);

  const sources = await SourceRepository.findByIds(
    [airSourceId ?? station.value.sourceId],
    now,
  );
  if (sources.isErr()) return err(sources.error);

  const source = sources.value.get(airSourceId ?? station.value.sourceId);
  if (source === undefined) return err(ERRORS.SOURCE_NOT_FOUND);
  if (!source.mayRedistribute) return err(ERRORS.SOURCE_NOT_REDISTRIBUTABLE);

  const aqi = byMetric.get(Metric.UsAqi);

  /*
   * India's National AQI, computed here rather than taken from the source.
   *
   * Open-Meteo publishes `us_aqi`, a US EPA index. CPCB's National AQI uses different
   * breakpoints and different band names, so the same air produces a different number and
   * often a different category — relabelling the US figure would have misreported it to an
   * Indian audience. The index is therefore derived from the concentrations, over the
   * averaging windows CPCB defines (24 hours, 8 for CO and ozone).
   *
   * Degrades to null rather than failing the request: air quality without an index is still
   * useful, and a partial index is not an index.
   */
  const averages = await ObservationRepository.pollutantAveragesForStation(
    station.value.id,
    AQI_WINDOWS,
  );
  const nationalAqi = averages.isErr()
    ? null
    : computeNationalAqi(
        withAdequateCoverage(
          averages.value.map((row) => ({
            metric: row.metric,
            average: row.average,
            sampleCount: row.sample_count,
          })),
        ),
      );

  const observedAt =
    [...byMetric.values()].map((observation) => observation.observedAt).sort().at(-1) ?? null;
  const resolvedSourceId = airSourceId ?? station.value.sourceId;

  return ok({
    station: station.value,
    aqi: aqi === undefined ? null : { value: aqi.value, band: classifyAqi(aqi.value) },
    nationalAqi,
    pm25: byMetric.get(Metric.Pm25),
    pm10: byMetric.get(Metric.Pm10),
    nitrogenDioxide: byMetric.get(Metric.NitrogenDioxide),
    ozone: byMetric.get(Metric.Ozone),
    sulphurDioxide: byMetric.get(Metric.SulphurDioxide),
    carbonMonoxide: byMetric.get(Metric.CarbonMonoxide),
    observedAt,
    source: {
      id: resolvedSourceId,
      key: source.key,
      department: source.department,
      attribution: source.attribution,
    },
  });
}
