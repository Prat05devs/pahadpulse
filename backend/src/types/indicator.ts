/**
 * `indicators` domain enums.
 *
 * Values must match the MySQL ENUMs in `006-create-indicators.sql` character for character.
 */

/**
 * The specification lists demography, education, health, economy, industry and
 * transparency as separate features; they share one shape, so category is a column
 * rather than a module split (indicators.md §8).
 */
export enum IndicatorCategory {
  Demography = 'demography',
  Education = 'education',
  Health = 'health',
  Economy = 'economy',
  Industry = 'industry',
  Connectivity = 'connectivity',
}

/** Which area type an indicator's values attach to. */
export enum IndicatorScope {
  State = 'state',
  District = 'district',
  Village = 'village',
}
