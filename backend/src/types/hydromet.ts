/**
 * `hydromet` domain enums.
 *
 * Values must match the MySQL ENUMs in `019-create-hydromet.sql` character for character.
 * See project/modules/hydromet.md.
 */

export enum StationType {
  Weather = 'weather',
  River = 'river',
  Reservoir = 'reservoir',
}

export enum Metric {
  TemperatureC = 'temperature_c',
  RainfallMm = 'rainfall_mm',
  HumidityPct = 'humidity_pct',
  RiverLevelM = 'river_level_m',
  ReservoirLevelM = 'reservoir_level_m',
  ReservoirStorageMcm = 'reservoir_storage_mcm',
  WindSpeedKmh = 'wind_speed_kmh',
  WindDirectionDeg = 'wind_direction_deg',
  /**
   * Daily forecast bounds. Separate metrics rather than two `temperature_c` rows told
   * apart by their validity window: `forecasts` is keyed on (area, metric, valid_from),
   * so one metric cannot hold both, and inferring which row was which from insertion
   * order is the kind of implicit contract that survives exactly until someone reorders
   * a query.
   */
  TemperatureMinC = 'temperature_min_c',
  TemperatureMaxC = 'temperature_max_c',
  /**
   * The WMO present-weather code, stored numerically with unit `wmo`.
   *
   * A category rather than a measurement, which HYD-2 accommodates precisely because the
   * unit travels with the row: nothing downstream can mistake a 51 here for millimetres.
   * Kept in `observations` rather than a column on its own so that "what was the weather at
   * 14:00" is one query, and so a second source supplying conditions needs no schema change.
   */
  WeatherCode = 'weather_code',

  /**
   * Air quality, stored against the same district stations as the weather metrics — a
   * PM2.5 reading at Gopeshwar has the same shape as a temperature reading there.
   *
   * `us_aqi` is a derived index rather than a measurement. It is kept because it is the
   * number people recognise, and the underlying concentrations are stored beside it so
   * nothing has to depend on the index alone.
   */
  Pm25 = 'pm2_5_ug_m3',
  Pm10 = 'pm10_ug_m3',
  UsAqi = 'us_aqi',
  NitrogenDioxide = 'nitrogen_dioxide_ug_m3',
  Ozone = 'ozone_ug_m3',
  SulphurDioxide = 'sulphur_dioxide_ug_m3',
  CarbonMonoxide = 'carbon_monoxide_ug_m3',
}

/**
 * US EPA AQI bands, for the label and colour on the air quality panel.
 *
 * The US scale, not India's CPCB National AQI, because the source computes `us_aqi` — and
 * relabelling its number against CPCB's different breakpoints would misreport it. A CPCB
 * scale belongs with a CPCB source, not bolted onto this one.
 */
export enum AqiBand {
  Good = 'good',
  Moderate = 'moderate',
  UnhealthyForSensitive = 'unhealthy_sensitive',
  Unhealthy = 'unhealthy',
  VeryUnhealthy = 'very_unhealthy',
  Hazardous = 'hazardous',
  Unknown = 'unknown',
}

export enum ThresholdLevel {
  Warning = 'warning',
  Danger = 'danger',
  HighestFloodLevel = 'hfl',
}

/**
 * The condition buckets the UI renders, derived from a WMO code.
 *
 * Deliberately coarse. WMO defines ~28 present-weather codes and the difference between
 * "light drizzle" and "moderate drizzle" is not a distinction a district dashboard should
 * make people parse — but the raw code is still stored, so a finer rendering never needs
 * a re-ingestion.
 */
export enum WeatherCondition {
  Clear = 'clear',
  PartlyCloudy = 'partly_cloudy',
  Cloudy = 'cloudy',
  Fog = 'fog',
  Drizzle = 'drizzle',
  Rain = 'rain',
  HeavyRain = 'heavy_rain',
  Snow = 'snow',
  Thunderstorm = 'thunderstorm',
  Unknown = 'unknown',
}
