/**
 * `hydromet` domain enums.
 *
 * Values must match the MySQL ENUMs in `010-create-hydromet.sql` character for character.
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
}

export enum ThresholdLevel {
  Warning = 'warning',
  Danger = 'danger',
  HighestFloodLevel = 'hfl',
}
