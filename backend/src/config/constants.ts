/** Every magic number in the codebase lives here. */

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const CACHE_TTL = {
  /**
   * Geography changes only by migration, so it is cached hard.
   * A district boundary changing is a government act, not a user action.
   */
  STATIC: 24 * 60 * 60,
} as const;

export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000,
  MAX_REQUESTS: 300,
} as const;

export const BODY_LIMIT = '1mb';

export const CACHE_TTL_SOURCES = 60 * 60; // 1h — the registry changes rarely

/**
 * Expected seconds between updates, per cadence. The single input to freshness (DS-3).
 * `static` never goes stale: it is not expected to change at all.
 */
export const CADENCE_INTERVAL_SECONDS = {
  realtime: 15 * 60,
  hourly: 60 * 60,
  daily: 24 * 60 * 60,
  monthly: 30 * 24 * 60 * 60,
  annual: 365 * 24 * 60 * 60,
  static: Number.POSITIVE_INFINITY,
} as const;

/**
 * Grace multipliers on the cadence interval.
 * Within 1x it is fresh; up to 3x it is stale; beyond that it is expired.
 * Generous on purpose — government feeds are irregular, and crying stale on every
 * late publication trains people to ignore the badge.
 */
export const FRESHNESS_GRACE = { STALE_AFTER: 1, EXPIRED_AFTER: 3 } as const;

/** A run still `running` after this long is treated as dead, not as a lock (DS-4). */
export const INGESTION_RUN_TIMEOUT_SECONDS = 30 * 60;

/** Uttarakhand has exactly 13 districts. The seed asserts this (rule GEO-6). */
export const UTTARAKHAND_DISTRICT_COUNT = 13;

export const CACHE_TTL_INDICATORS = 60 * 60; // 1h — per-area values and comparison
export const CACHE_TTL_INDICATOR_SERIES = 6 * 60 * 60; // 6h — trend and ranking change slowly

/** The demo source's registry key (indicators.md-equivalent §8 decision, recorded in code). */
export const DEMO_SOURCE_KEY = 'pahad-pulse-demo-data';

/** Alerts change fast during an incident; short enough to be current, long enough to
 *  survive a front-page traffic spike (alerts.md §5). */
export const CACHE_TTL_ALERTS = 60;

export const IMD_CAP = {
  INDEX_URL: 'https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml',
  /** Bounds one ingestion run: the index typically holds ~10 items, this is a safety cap. */
  MAX_ITEMS_PER_RUN: 30,
  FETCH_TIMEOUT_MS: 10_000,
  FETCH_RETRIES: 2,
} as const;
