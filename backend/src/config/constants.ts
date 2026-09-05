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
export const CACHE_TTL_LIVE_SOURCE_STATUS = 60; // 1m — upstream health should stay current

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

export const SACHET = {
  /**
   * The per-state CAP feed. SACHET filters to Uttarakhand at source, which is the whole
   * reason this source exists alongside the national IMD feed — see migration 011.
   */
  STATE_FEED_URL: 'https://sachet.ndma.gov.in/cap_public_website/rss/rss_uttarakhand.xml',
  ALERT_URL: 'https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=',
  POLYGON_URL: 'https://sachet.ndma.gov.in/cap_public_website/FetchPolygonXMLFile?identifier=',
  /** The state feed held 10 items when verified; this is a safety cap, not an expectation. */
  MAX_ITEMS_PER_RUN: 40,
  FETCH_TIMEOUT_MS: 20_000,
  FETCH_RETRIES: 2,
} as const;

/**
 * Overpass, for OSM administrative boundaries.
 *
 * MIRRORS, plural, and in this order deliberately: the main overpass-api.de instance
 * answered "the server is probably too busy" on two of three attempts while this connector
 * was being built (2026-09-04), and private.coffee answered every time. A boundary refresh
 * that fails because one volunteer-run mirror is busy is a bad reason to have no map.
 */
export const OVERPASS = {
  MIRRORS: [
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ],
  /** OSM relation id for Uttarakhand (ISO 3166-2 `IN-UK`), verified 2026-09-04. */
  STATE_RELATION_ID: 9987086,
  /**
   * India's districts sit at admin_level 5, not the 6 that many countries use. Verified:
   * level 5 returns exactly our 13 districts; level 6 returns 80 tehsils.
   */
  DISTRICT_ADMIN_LEVEL: 5,
  /** Tehsils sit one level below districts. Verified: level 6 returns 80 relations. */
  TEHSIL_ADMIN_LEVEL: 6,
  FETCH_TIMEOUT_MS: 300_000,
  FETCH_RETRIES: 1,
  /**
   * Overpass's usage policy requires a self-identifying client, and the main instance
   * answers 406 Not Acceptable without one. Anonymous requests are also the first to be
   * rate-limited when a mirror is under load.
   */
  USER_AGENT: 'PahadPulse/0.1 (Uttarakhand public data portal)',
} as const;

/**
 * Douglas–Peucker tolerance, in degrees, for the geometry the map receives (GEO-5: the map
 * never receives full precision).
 *
 * 0.002° is roughly 200 m at this latitude. Full-precision Uttarakhand district boundaries
 * are ~46,000 points, which is about 1 MB of GeoJSON on every map load — over a mountain
 * connection that is the difference between a map and a blank screen. At district-and-above
 * zoom the simplified outline is visually identical.
 *
 * The full-precision geometry is still stored, in `geojson`; this only governs
 * `simplified_geojson`, which is what the API serves.
 */
export const BOUNDARY_SIMPLIFY_TOLERANCE_DEGREES = 0.002;

/** Alert geometry is simplified harder: it is advisory extent, not a legal boundary. */
export const ALERT_SIMPLIFY_TOLERANCE_DEGREES = 0.005;

/** The map's district layer is geography — it changes by migration. Cached like the rest. */
export const CACHE_TTL_MAP_DISTRICTS = 24 * 60 * 60;
