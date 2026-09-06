-- 019 — hydromet: monitoring stations and the measurements they report.
--
-- See project/modules/hydromet.md. The module doc numbered these 008/009; those numbers
-- were taken by the alerts tables before hydromet was built, so the tables land here
-- instead. The doc has been corrected rather than the history rewritten.
--
-- SCOPE: this migration creates what the district weather panel needs — stations,
-- observations, forecasts. `station_thresholds` is deliberately NOT created yet: it exists
-- to satisfy HYD-3 (a river level is never shown without its danger threshold), and there
-- is no river source until CWC access is resolved. Creating an empty table would invite
-- exactly the half-built river panel HYD-3 is written to prevent.
--
-- Provenance (DS-1): every row here carries source_id and fetched_at. `observed_at` is what
-- the value DESCRIBES and fills the vintage role, exactly as `issued_at` does for alerts
-- (see migration 008's header note).

CREATE TABLE IF NOT EXISTS stations (
  id                  INT AUTO_INCREMENT PRIMARY KEY,

  source_id           INT NOT NULL,
  -- The source's own code for this station. For a coordinate-addressed source like
  -- Open-Meteo there is no upstream station id, so the connector supplies a stable
  -- synthetic one (`open-meteo:<district-slug>`) — it is still the upsert key.
  source_station_code VARCHAR(128) NOT NULL,

  type                ENUM('weather','river','reservoir') NOT NULL,

  name_en             VARCHAR(128) NOT NULL,
  name_hi             VARCHAR(128) NOT NULL,

  -- The area this station reports FOR. Not necessarily the area it sits in: a district
  -- weather station is placed at the district headquarters and reports for the district.
  area_id             INT NOT NULL,

  lat                 DECIMAL(9,6) NOT NULL,
  lng                 DECIMAL(9,6) NOT NULL,

  -- River stations only. NULL for weather stations.
  river_name          VARCHAR(128) NULL,

  is_active           BOOLEAN NOT NULL DEFAULT TRUE,

  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_stations_source
    FOREIGN KEY (source_id) REFERENCES sources(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_stations_area
    FOREIGN KEY (area_id) REFERENCES areas(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  UNIQUE KEY uq_station_source_code (source_id, source_station_code),
  -- "the stations in this district, of this type" — the district panel's only lookup.
  KEY idx_station_area_type (area_id, type, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- The time series. This is the highest-growth table in the product: 13 districts x 6
-- metrics x hourly is ~680k rows/year, which InnoDB handles without ceremony but which
-- still needs the retention policy recorded as an open question in hydromet.md.
CREATE TABLE IF NOT EXISTS observations (
  station_id          INT NOT NULL,
  metric              ENUM(
                        'temperature_c','rainfall_mm','humidity_pct',
                        'river_level_m','reservoir_level_m','reservoir_storage_mcm',
                        'wind_speed_kmh','wind_direction_deg','weather_code',
                        'temperature_min_c','temperature_max_c'
                      ) NOT NULL,
  observed_at         DATETIME NOT NULL,

  value               DECIMAL(12,3) NOT NULL,
  -- HYD-2: stored per row and never assumed from the metric. Upstream sources change
  -- units without notice, and a silently reinterpreted column is unrecoverable.
  unit                VARCHAR(16) NOT NULL,

  source_id           INT NOT NULL,
  fetched_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- HYD-1: (station, metric, observed_at) identifies an observation. Re-ingesting the same
  -- hour updates in place, which is what makes the hourly cron safe to re-run (DS-5).
  PRIMARY KEY (station_id, metric, observed_at),

  CONSTRAINT fk_observations_station
    FOREIGN KEY (station_id) REFERENCES stations(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_observations_source
    FOREIGN KEY (source_id) REFERENCES sources(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  -- Serves both queries that exist: "latest reading" and "the series for this chart".
  -- DESC because every read wants the newest end.
  KEY idx_obs_station_metric_time (station_id, metric, observed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Forward-looking values. Superseded wholesale on each run rather than accumulated: nobody
-- asks what yesterday's forecast for tomorrow was, and keeping them would quietly make this
-- table larger than `observations`.
CREATE TABLE IF NOT EXISTS forecasts (
  area_id             INT NOT NULL,
  metric              ENUM(
                        'temperature_c','rainfall_mm','humidity_pct',
                        'river_level_m','reservoir_level_m','reservoir_storage_mcm',
                        'wind_speed_kmh','wind_direction_deg','weather_code',
                        'temperature_min_c','temperature_max_c'
                      ) NOT NULL,
  valid_from          DATETIME NOT NULL,
  valid_to            DATETIME NOT NULL,

  value               DECIMAL(12,3) NOT NULL,
  unit                VARCHAR(16) NOT NULL,

  source_id           INT NOT NULL,
  fetched_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (area_id, metric, valid_from),

  CONSTRAINT fk_forecasts_area
    FOREIGN KEY (area_id) REFERENCES areas(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_forecasts_source
    FOREIGN KEY (source_id) REFERENCES sources(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  KEY idx_forecast_area_valid (area_id, valid_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ROLLBACK
-- DROP TABLE IF EXISTS forecasts;
-- DROP TABLE IF EXISTS observations;
-- DROP TABLE IF EXISTS stations;
