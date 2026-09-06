-- 006 — hydromet: monitoring stations, the observation time series, and its retention.
--
-- See project/modules/hydromet.md.
--
-- THE RETENTION POLICY IS PART OF THE SCHEMA, not a later addition. hydromet.md §9 has
-- listed it as an open question since the module was designed, with the note that this
-- table "outgrows everything else". The measured rate is 169 rows an hour — 78 weather and
-- 91 air quality — which is 1.48 million rows a year, roughly 249 MB. Against Supabase's
-- 500 MB the database is fine for about eighteen months and then is not.
--
-- Deferring that decision does not avoid it, it just guarantees it arrives as an emergency
-- under a hard ceiling. So: raw rows for 90 days, daily aggregates kept indefinitely.
-- Steady state is roughly 74 MB and flat, and the year-over-year comparisons the rollup
-- preserves are the only thing anyone actually asks a multi-year series for.

CREATE TABLE stations (
  id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  source_id           INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  -- The source's own code. A coordinate-addressed source like Open-Meteo has none, so the
  -- connector supplies a stable synthetic one (`open-meteo:<district-slug>`).
  source_station_code VARCHAR(128) NOT NULL,

  type                station_type NOT NULL,

  name_en             VARCHAR(128) NOT NULL,
  name_hi             VARCHAR(128) NOT NULL,

  -- The area this station reports FOR, which is not necessarily the area it sits in: a
  -- district weather station is placed at the headquarters and reports for the district.
  area_id             INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  location            geography(Point, 4326) NOT NULL,

  -- River stations only.
  river_name          VARCHAR(128),

  is_active           BOOLEAN NOT NULL DEFAULT TRUE,

  created_at          TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at          TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  CONSTRAINT uq_station_source_code UNIQUE (source_id, source_station_code)
);

-- "The stations in this district, of this type" — the district panel's only lookup.
CREATE INDEX idx_station_area_type ON stations (area_id, type, is_active);
CREATE INDEX idx_station_location ON stations USING GIST (location);

CREATE TRIGGER stations_updated_at BEFORE UPDATE ON stations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- The raw time series. Pruned to 90 days by the retention job below.
CREATE TABLE observations (
  station_id          INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  metric              metric NOT NULL,
  observed_at         TIMESTAMP NOT NULL,

  value               NUMERIC(12,3) NOT NULL,
  -- HYD-2: stored per row, never assumed from the metric. Upstream sources change units
  -- without notice, and a silently reinterpreted column is unrecoverable.
  unit                VARCHAR(16) NOT NULL,

  source_id           INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  fetched_at          TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  -- HYD-1: (station, metric, observed_at) identifies an observation. Re-ingesting the same
  -- hour updates in place, which is what makes the hourly cron safe to re-run (DS-5).
  PRIMARY KEY (station_id, metric, observed_at)
);

-- Serves both queries that exist: "latest reading" and "the series for this chart".
CREATE INDEX idx_obs_station_metric_time ON observations (station_id, metric, observed_at DESC);
-- Serves the retention sweep, which is otherwise a full scan every night.
CREATE INDEX idx_obs_observed_at ON observations (observed_at);

/*
 * Daily aggregates, kept indefinitely.
 *
 * This is what makes a multi-year history affordable: one row per station, metric and day
 * instead of twenty-four. Min, max and mean rather than a single average, because "how hot
 * did it get" and "how cold overnight" are the questions a daily summary is asked, and a
 * mean answers neither.
 *
 * `sample_count` is carried so a partial day — the rollup running while a day is still
 * accumulating, or a day the ingestion missed — is visible as partial rather than passing
 * for a complete one.
 */
CREATE TABLE observations_daily (
  station_id          INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  metric              metric NOT NULL,
  -- The local (IST) day this summarises. Local, not UTC: a "day" here means a day as the
  -- reader lives it, the same choice the forecast display makes.
  day                 DATE NOT NULL,

  value_min           NUMERIC(12,3) NOT NULL,
  value_max           NUMERIC(12,3) NOT NULL,
  value_avg           NUMERIC(12,3) NOT NULL,
  sample_count        INTEGER NOT NULL,
  unit                VARCHAR(16) NOT NULL,

  source_id           INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  created_at          TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at          TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  PRIMARY KEY (station_id, metric, day)
);

CREATE INDEX idx_obs_daily_station_metric_day ON observations_daily (station_id, metric, day DESC);

CREATE TRIGGER observations_daily_updated_at BEFORE UPDATE ON observations_daily
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

/*
 * Forward-looking values. Superseded wholesale on each run rather than accumulated: nobody
 * asks what yesterday's forecast for tomorrow was, and keeping them would quietly make
 * this table larger than `observations`.
 */
CREATE TABLE forecasts (
  area_id             INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  metric              metric NOT NULL,
  valid_from          TIMESTAMP NOT NULL,
  valid_to            TIMESTAMP NOT NULL,

  value               NUMERIC(12,3) NOT NULL,
  unit                VARCHAR(16) NOT NULL,

  source_id           INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  fetched_at          TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  PRIMARY KEY (area_id, metric, valid_from)
);

CREATE INDEX idx_forecast_area_valid ON forecasts (area_id, valid_from);

/*
 * `station_thresholds` is deliberately NOT created. It exists to satisfy HYD-3 — a river
 * level is never shown without its danger threshold — and there is no river source until
 * CWC access is resolved. An empty table would invite exactly the half-built river panel
 * HYD-3 is written to prevent.
 */

-- ROLLBACK
-- DROP TABLE IF EXISTS forecasts, observations_daily, observations, stations;
