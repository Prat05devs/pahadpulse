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
  // Ookla publishes one quarter at a time, a few weeks after it closes.
  quarterly: 91 * 24 * 60 * 60,
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

/**
 * Observations are re-read hourly by the connector, so a 10-minute cache never serves a
 * reading the ingestion has already replaced, and absorbs a district page being refreshed.
 * Matches the TTL hydromet.md §5 specifies for `/areas/:slug/weather`.
 */
export const CACHE_TTL_OBSERVATIONS = 10 * 60;

/**
 * Open-Meteo — current conditions and daily forecast, by coordinate.
 *
 * No API key and no registration. Chosen over IMD's own endpoints for one reason that
 * outranks provenance here: Open-Meteo publishes under CC-BY 4.0, so its values may
 * actually be DISPLAYED. IMD's redistribution terms are unconfirmed, which is why
 * `imd-cap-alerts` sits at `may_redistribute = FALSE` and shows nothing (migration 009).
 *
 * This is a source-chain decision, not a claim that Open-Meteo outranks IMD (HYD-5): when
 * IMD's terms are confirmed it is added ahead of this one, and the source actually used is
 * always named in the response.
 */
export const OPEN_METEO = {
  FORECAST_URL: 'https://api.open-meteo.com/v1/forecast',
  /** WMO codes plus what the district panel shows. Order matters — see the connector. */
  CURRENT_FIELDS: [
    'temperature_2m',
    'relative_humidity_2m',
    'precipitation',
    'weather_code',
    'wind_speed_10m',
    'wind_direction_10m',
  ] as const,
  DAILY_FIELDS: [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
  ] as const,
  /** IST. Open-Meteo aligns daily buckets to this, so forecast days are local days. */
  TIMEZONE: 'Asia/Kolkata',
  FORECAST_DAYS: 7,
  FETCH_TIMEOUT_MS: 15_000,
  FETCH_RETRIES: 2,
} as const;

/**
 * Open-Meteo Air Quality — Copernicus CAMS, by coordinate. Keyless, CC-BY 4.0.
 *
 * Modelled, not measured. CPCB runs real reference-grade monitors in Uttarakhand and those
 * are authoritative where they exist — but they exist in a handful of towns, and this
 * covers every district including the ones with no instrument at all. The UI says which it
 * is showing; the source registry note (migration 028) records why both can coexist.
 */
export const OPEN_METEO_AIR = {
  URL: 'https://air-quality-api.open-meteo.com/v1/air-quality',
  CURRENT_FIELDS: [
    'pm10',
    'pm2_5',
    'carbon_monoxide',
    'nitrogen_dioxide',
    'sulphur_dioxide',
    'ozone',
    'us_aqi',
  ] as const,
  /**
   * The same pollutants again, as an hourly series.
   *
   * India's National AQI is defined over 24-hour averages (8-hour for CO and ozone), so the
   * spot reading `current` returns cannot produce one. Without this the index would have to
   * wait 16 hours after a fresh deployment before the hourly cron had accumulated CPCB's
   * minimum coverage — and would silently be an hourly value wearing a 24-hour label if
   * that minimum were not enforced.
   *
   * `us_aqi` is deliberately absent: it is a derived index, and storing a 72-hour series of
   * someone else's index has no use that the concentrations do not serve better.
   */
  HOURLY_FIELDS: [
    'pm10',
    'pm2_5',
    'carbon_monoxide',
    'nitrogen_dioxide',
    'sulphur_dioxide',
    'ozone',
  ] as const,
  /**
   * Two days back. A 24-hour window needs 24 hours of history, and the second day is margin
   * for a cron that has missed a run — not an appetite for history. Re-ingesting the same
   * hours is free: observations upsert on (station, metric, observed_at), so a repeated run
   * rewrites rows rather than multiplying them (HYD-1, DS-5).
   */
  PAST_DAYS: 2,
  TIMEZONE: 'Asia/Kolkata',
  FETCH_TIMEOUT_MS: 15_000,
  FETCH_RETRIES: 2,
} as const;

/**
 * USGS earthquakes, filtered to the Uttarakhand bounding box.
 *
 * Keyless and public domain (US Government work). The National Center for Seismology is
 * the Indian authority and should lead this source chain once its terms are known — the
 * same relationship IMD has to Open-Meteo for weather.
 */
export const USGS = {
  QUERY_URL: 'https://earthquake.usgs.gov/fdsnws/event/1/query',
  /**
   * How far back each run looks. Generous relative to the hourly schedule on purpose:
   * USGS revises magnitude and depth for hours after an event as more stations report, and
   * a window that only covered "since the last run" would freeze the first, roughest
   * estimate. Re-reading a settled event is free — the upsert replaces it (DS-5).
   */
  LOOKBACK_DAYS: 90,
  /**
   * No magnitude floor. A M2.5 in a fragile Himalayan valley is information; filtering the
   * feed to the dramatic ones would be this platform editorialising about what counts.
   * The UI decides what to foreground, the ingestion keeps everything.
   */
  MIN_MAGNITUDE: null,
  BBOX: { MIN_LAT: 28.4, MAX_LAT: 31.5, MIN_LNG: 77.5, MAX_LNG: 81.1 },
  MAX_ITEMS_PER_RUN: 500,
  FETCH_TIMEOUT_MS: 20_000,
  FETCH_RETRIES: 2,
} as const;

/** Seismic history is append-mostly and changes on ingestion, not on read. */
export const CACHE_TTL_SEISMIC = 5 * 60;

/**
 * GDACS — the Global Disaster Alert and Coordination System (European Commission JRC + UN).
 *
 * Its RSS declares `<copyright>public domain</copyright>`, which is why this is seeded
 * `may_redistribute = TRUE` while IMD is not.
 *
 * Complements SACHET rather than duplicating it: SACHET carries Indian meteorological
 * warnings, GDACS carries scored disaster EVENTS (flood, earthquake, cyclone) with an
 * international GLIDE number. An event can appear in both, which is what the alerts upsert
 * key is for — they are separate sources, so they are separate rows, never merged (ALR-1).
 */
export const GDACS = {
  EVENT_LIST_URL: 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH',
  /** Flood, earthquake, tropical cyclone. The three that reach Uttarakhand. */
  EVENT_TYPES: 'EQ;TC;FL',
  COUNTRY: 'India',
  /**
   * Uttarakhand's bounding box, generously drawn. GDACS reports nationally, so events are
   * filtered to the state by point-in-box before anything is written — an Assam flood is
   * not this product's concern.
   */
  BBOX: { MIN_LAT: 28.4, MAX_LAT: 31.5, MIN_LNG: 77.5, MAX_LNG: 81.1 },
  MAX_ITEMS_PER_RUN: 50,
  FETCH_TIMEOUT_MS: 20_000,
  FETCH_RETRIES: 2,
} as const;
