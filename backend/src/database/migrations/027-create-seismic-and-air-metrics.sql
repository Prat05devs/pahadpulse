-- 027 — air-quality metrics, and the seismic event table.
--
-- TWO CONCERNS IN ONE FILE because they are the same decision seen twice: what is an
-- observation, and what is an alert.
--
-- AIR QUALITY reuses `observations` and the existing district stations entirely. A PM2.5
-- reading at Gopeshwar is the same shape as a temperature reading at Gopeshwar — a value,
-- a unit, a station, an instant. It needs new ENUM members and nothing else. Creating an
-- `air_quality` table would have duplicated the time series, the upsert rule (HYD-1) and
-- the staleness handling (HYD-6) for no gain.
--
-- EARTHQUAKES do NOT go in `alerts`, and this is the more interesting call. `alerts` models
-- time-bounded WARNINGS issued by an authority (alerts.md §1). An earthquake record is not
-- a warning — it is a measurement of something that already happened. Putting an M5.1 into
-- `alerts` would either show a three-week-old tremor as an "active alert", or require
-- inventing an `expires_at` the source never stated, which ALR-3 forbids. It gets its own
-- table so it can be displayed as what it is: an observed event, with a magnitude.
--
-- The GDACS precedent (migration 022) is not contradicted. GDACS publishes a scored,
-- ongoing, humanitarian ALERT LEVEL with a validity window — that is a warning. USGS
-- publishes the fact that the ground moved.

ALTER TABLE observations
  MODIFY COLUMN metric ENUM(
    'temperature_c','rainfall_mm','humidity_pct',
    'river_level_m','reservoir_level_m','reservoir_storage_mcm',
    'wind_speed_kmh','wind_direction_deg','weather_code',
    'temperature_min_c','temperature_max_c',
    'pm2_5_ug_m3','pm10_ug_m3','us_aqi',
    'nitrogen_dioxide_ug_m3','ozone_ug_m3','sulphur_dioxide_ug_m3','carbon_monoxide_ug_m3'
  ) NOT NULL;

ALTER TABLE forecasts
  MODIFY COLUMN metric ENUM(
    'temperature_c','rainfall_mm','humidity_pct',
    'river_level_m','reservoir_level_m','reservoir_storage_mcm',
    'wind_speed_kmh','wind_direction_deg','weather_code',
    'temperature_min_c','temperature_max_c',
    'pm2_5_ug_m3','pm10_ug_m3','us_aqi',
    'nitrogen_dioxide_ug_m3','ozone_ug_m3','sulphur_dioxide_ug_m3','carbon_monoxide_ug_m3'
  ) NOT NULL;

-- Observed earthquakes. Not warnings — see the header note.
CREATE TABLE IF NOT EXISTS seismic_events (
  id                INT AUTO_INCREMENT PRIMARY KEY,

  source_id         INT NOT NULL,
  -- USGS's own event id, e.g. `us7000abcd`. Upsert key: USGS revises magnitude and depth
  -- for hours after an event as more stations report, and a revision must REPLACE our row
  -- rather than create a second earthquake that never happened.
  source_event_id   VARCHAR(128) NOT NULL,

  -- Moment magnitude, usually. `magnitude_type` records which scale, because mb, ml and mw
  -- are not interchangeable and a bare number implies a precision the source does not claim.
  magnitude         DECIMAL(4,2) NOT NULL,
  magnitude_type    VARCHAR(16) NULL,

  -- Kilometres below the surface. Depth is what separates a damaging shallow quake from a
  -- deep one felt as a rumble, so it is stored NOT NULL where the source gives it.
  depth_km          DECIMAL(7,2) NULL,

  -- USGS's own human-readable place string, kept verbatim. Not re-derived into our own
  -- district names: "115 km NE of Joshimath" is the source's statement about location and
  -- rewriting it would be us asserting a district we have not verified.
  place             VARCHAR(512) NOT NULL,

  lat               DECIMAL(9,6) NOT NULL,
  lng               DECIMAL(9,6) NOT NULL,

  -- When the ground moved. This is what the record DESCRIBES and fills the vintage role.
  occurred_at       DATETIME NOT NULL,

  -- USGS review status: `automatic` is an unreviewed machine solution, `reviewed` has been
  -- checked by a seismologist. Displayed, because an automatic M5 may be revised.
  review_status     VARCHAR(32) NULL,

  web_url           VARCHAR(2048) NULL,

  fetched_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_seismic_source
    FOREIGN KEY (source_id) REFERENCES sources(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  UNIQUE KEY uq_seismic_source_event (source_id, source_event_id),
  -- The only query that exists: recent events, newest first, optionally above a magnitude.
  KEY idx_seismic_occurred (occurred_at DESC, magnitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ROLLBACK
-- DROP TABLE IF EXISTS seismic_events;
-- The ENUM reductions are only safe once no row uses the new members.
