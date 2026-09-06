import { AqiBand, Metric, StationType, WeatherCondition } from '../types/hydromet.js';
import { toIsoUtc } from '../utils/datetime.js';
import type { LocalisedText } from './alert.model.js';

export const STATIONS_TABLE = 'stations';
export const OBSERVATIONS_TABLE = 'observations';
export const FORECASTS_TABLE = 'forecasts';

export interface StationRow {
  id: number;
  source_id: number;
  source_station_code: string;
  type: StationType;
  name_en: string;
  name_hi: string;
  area_id: number;
  /** DECIMAL columns arrive as strings; the driver never narrows them to number. */
  lat: string;
  lng: string;
  river_name: string | null;
  is_active: number;
}

export interface ObservationRow {
  station_id: number;
  metric: Metric;
  observed_at: string;
  value: string;
  unit: string;
  source_id: number;
  fetched_at: string;
}

export interface ForecastRow {
  area_id: number;
  metric: Metric;
  valid_from: string;
  valid_to: string;
  value: string;
  unit: string;
  source_id: number;
  fetched_at: string;
}

/** The API shape of a station. Mirrors `StationSchema` in the web app. */
export interface Station {
  id: number;
  sourceStationCode: string;
  type: StationType;
  name: LocalisedText;
  areaId: number;
  lat: number;
  lng: number;
  riverName: string | null;
  sourceId: number;
}

/** The API shape of one reading. Mirrors `ObservationSchema` in the web app. */
export interface Observation {
  stationId: number;
  metric: Metric;
  observedAt: string;
  value: number;
  unit: string;
  sourceId: number;
  fetchedAt: string;
}

export interface ForecastDay {
  date: string;
  minTemperatureC: number | null;
  maxTemperatureC: number | null;
  precipitationMm: number | null;
  condition: ConditionOut | null;
}

export interface ConditionOut {
  /** The raw WMO code, kept so a finer rendering never needs a re-ingestion. */
  code: number;
  condition: WeatherCondition;
  label: LocalisedText;
}

/**
 * What `GET /api/areas/:slug/weather` returns.
 *
 * `temperature`, `rainfall` and `humidity` are the three fields the web app's
 * `WeatherDataSchema` already required before this module existed, and they keep those
 * exact names and shapes: the district page has been calling this endpoint (and catching
 * its 404) since before there was anything behind it, so conforming to the existing
 * contract lights up the panel already written there rather than requiring it to change.
 *
 * Everything below `humidity` is additive and optional, which is what keeps that true.
 */
export interface AreaWeather {
  station: Station;
  // `| undefined` is required explicitly under `exactOptionalPropertyTypes`: these are
  // absent-or-present, and JSON serialisation drops the undefined keys entirely, which is
  // what makes an absent reading absent in the response rather than null (HYD-6).
  temperature?: Observation | undefined;
  rainfall?: Observation | undefined;
  humidity?: Observation | undefined;
  wind?: Observation | undefined;
  windDirection?: Observation | undefined;
  condition: ConditionOut | null;
  /**
   * The instant the reading describes — the newest `observed_at` among the metrics above.
   * Hoisted out of the individual observations because the panel states it once, and
   * HYD-6 requires it to be shown rather than implied.
   */
  observedAt: string | null;
  forecast: ForecastDay[];
  /** HYD-5: the source actually used is named, never left for the reader to assume. */
  source: {
    id: number;
    key: string;
    department: LocalisedText;
    attribution: string;
  };
}

export function toStation(row: StationRow): Station {
  return {
    id: row.id,
    sourceStationCode: row.source_station_code,
    type: row.type,
    name: { en: row.name_en, hi: row.name_hi },
    areaId: row.area_id,
    lat: Number(row.lat),
    lng: Number(row.lng),
    riverName: row.river_name,
    sourceId: row.source_id,
  };
}

/**
 * Returns null when a timestamp cannot be converted rather than emitting a bare MySQL
 * datetime: the web schema parses these with Zod's `.datetime()`, so a naive string would
 * fail validation on the client and take the whole panel down with it.
 */
export function toObservation(row: ObservationRow): Observation | null {
  const observedAt = toIsoUtc(row.observed_at);
  const fetchedAt = toIsoUtc(row.fetched_at);
  if (observedAt === null || fetchedAt === null) return null;

  return {
    stationId: row.station_id,
    metric: row.metric,
    observedAt,
    value: Number(row.value),
    unit: row.unit,
    sourceId: row.source_id,
    fetchedAt,
  };
}

/**
 * WMO present-weather code → the bucket the UI renders.
 *
 * The full table is 28 codes across nine groups. Grouping happens here, once, so that
 * every surface describes the same sky the same way — and the raw code travels alongside
 * so nothing is lost by the simplification.
 *
 * Reference: WMO code table 4677, as published in the Open-Meteo docs.
 */
export function classifyWeatherCode(code: number): WeatherCondition {
  if (code === 0) return WeatherCondition.Clear;
  if (code === 1 || code === 2) return WeatherCondition.PartlyCloudy;
  if (code === 3) return WeatherCondition.Cloudy;
  if (code === 45 || code === 48) return WeatherCondition.Fog;
  if (code >= 51 && code <= 57) return WeatherCondition.Drizzle;
  // 61–65 rain, 80–82 rain showers. 65 and 82 are the "violent"/"heavy" ends of each.
  if (code === 65 || code === 82) return WeatherCondition.HeavyRain;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return WeatherCondition.Rain;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return WeatherCondition.Snow;
  if (code >= 95 && code <= 99) return WeatherCondition.Thunderstorm;
  return WeatherCondition.Unknown;
}

/**
 * Hindi labels are first-class here, not a translation afterthought: this is a public data
 * portal for Uttarakhand, and every other user-facing string in the schema carries both.
 */
const CONDITION_LABELS: Record<WeatherCondition, LocalisedText> = {
  [WeatherCondition.Clear]: { en: 'Clear', hi: 'साफ़' },
  [WeatherCondition.PartlyCloudy]: { en: 'Partly cloudy', hi: 'आंशिक बादल' },
  [WeatherCondition.Cloudy]: { en: 'Cloudy', hi: 'बादल छाए' },
  [WeatherCondition.Fog]: { en: 'Fog', hi: 'कोहरा' },
  [WeatherCondition.Drizzle]: { en: 'Drizzle', hi: 'बूंदाबांदी' },
  [WeatherCondition.Rain]: { en: 'Rain', hi: 'वर्षा' },
  [WeatherCondition.HeavyRain]: { en: 'Heavy rain', hi: 'भारी वर्षा' },
  [WeatherCondition.Snow]: { en: 'Snow', hi: 'बर्फ़बारी' },
  [WeatherCondition.Thunderstorm]: { en: 'Thunderstorm', hi: 'गरज के साथ तूफ़ान' },
  [WeatherCondition.Unknown]: { en: 'Unknown', hi: 'अज्ञात' },
};

export function toCondition(code: number): ConditionOut {
  const condition = classifyWeatherCode(code);
  return { code, condition, label: CONDITION_LABELS[condition] };
}

export interface AqiOut {
  value: number;
  band: AqiBand;
}

/** What `GET /api/areas/:slug/air-quality` returns. */
export interface AreaAirQuality {
  station: Station;
  /** Null when the source gave concentrations but no index. */
  aqi: AqiOut | null;
  pm25?: Observation | undefined;
  pm10?: Observation | undefined;
  nitrogenDioxide?: Observation | undefined;
  ozone?: Observation | undefined;
  sulphurDioxide?: Observation | undefined;
  carbonMonoxide?: Observation | undefined;
  observedAt: string | null;
  source: {
    id: number;
    key: string;
    department: LocalisedText;
    attribution: string;
  };
}

/**
 * US EPA AQI breakpoints.
 *
 * These are the US scale's own boundaries, applied to the US index the source computes.
 * India's CPCB National AQI uses different breakpoints AND different band names, so a CPCB
 * label on this number would misdescribe it — the two scales disagree about what counts as
 * "moderate" by a wide margin at the levels common in north India.
 */
export function classifyAqi(value: number): AqiBand {
  if (value <= 50) return AqiBand.Good;
  if (value <= 100) return AqiBand.Moderate;
  if (value <= 150) return AqiBand.UnhealthyForSensitive;
  if (value <= 200) return AqiBand.Unhealthy;
  if (value <= 300) return AqiBand.VeryUnhealthy;
  if (value > 300) return AqiBand.Hazardous;
  return AqiBand.Unknown;
}
