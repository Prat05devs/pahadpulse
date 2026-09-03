/**
 * `alerts` domain enums.
 *
 * Values must match the MySQL ENUMs in `008-create-alerts.sql` character for character.
 */

export enum AlertType {
  Weather = 'weather',
  River = 'river',
  Flood = 'flood',
  Road = 'road',
  Disaster = 'disaster',
}

/**
 * Mirrors CAP 1.2's own severity scale (alerts.md §8 decision): the first source is IMD's
 * CAP feed, and re-mapping severity into a bespoke scale loses meaning exactly where
 * meaning matters most.
 */
export enum AlertSeverity {
  Minor = 'minor',
  Moderate = 'moderate',
  Severe = 'severe',
  Extreme = 'extreme',
  /** The source did not state one, or stated a value outside CAP's four. Never guessed. */
  Unknown = 'unknown',
}

/** CAP's urgency scale, captured because it is real information in the source, not invented. */
export enum AlertUrgency {
  Immediate = 'immediate',
  Expected = 'expected',
  Future = 'future',
  Past = 'past',
  Unknown = 'unknown',
}

/** CAP's certainty scale. */
export enum AlertCertainty {
  Observed = 'observed',
  Likely = 'likely',
  Possible = 'possible',
  Unlikely = 'unlikely',
  Unknown = 'unknown',
}

export enum AlertStatus {
  Active = 'active',
  Expired = 'expired',
  Cancelled = 'cancelled',
  Superseded = 'superseded',
}
