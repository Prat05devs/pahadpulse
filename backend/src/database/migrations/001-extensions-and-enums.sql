-- 001 — extensions and the domain enums.
--
-- This is the first migration of the PostgreSQL schema. It replaces twenty-seven MySQL
-- migrations, collapsed into a readable baseline rather than translated one by one: those
-- twenty-seven existed to evolve a live database incrementally, and there is no live
-- MySQL database whose history has to be preserved. Every row in the old one is
-- re-ingestible — geography and boundaries from OpenStreetMap, sources and catalogues from
-- seed migrations, observations and alerts from the live connectors — so the schema was
-- rewritten as it should have been designed, and the data refilled by running ingestion.
-- The MySQL files remain in git history for anyone who needs to see how it got here.
--
-- PostGIS is the reason this move is worth making beyond hosting cost. The MySQL schema
-- stored boundaries as JSON and did point-in-polygon in TypeScript — a hand-rolled ray cast
-- with a bounding-box pre-filter, placing ~13,000 villages inside 78 tehsils. That is a
-- spatial index's job.

CREATE EXTENSION IF NOT EXISTS postgis;

-- Enums are real types here rather than inline column definitions. In MySQL an ENUM belongs
-- to one column, so widening the indicator categories meant an ALTER of that table; a named
-- type is altered once and every column using it follows.
--
-- Values must match the TypeScript enums in `src/types/` character for character.

CREATE TYPE area_type AS ENUM ('state', 'district', 'tehsil', 'village');
CREATE TYPE division AS ENUM ('garhwal', 'kumaon');

CREATE TYPE access_method AS ENUM ('api', 'feed', 'bulk', 'manual');
CREATE TYPE cadence AS ENUM ('realtime', 'hourly', 'daily', 'monthly', 'annual', 'static');
CREATE TYPE metadata_status AS ENUM ('provisional', 'verified');
CREATE TYPE run_status AS ENUM ('running', 'succeeded', 'failed', 'partial_success');

CREATE TYPE indicator_category AS ENUM (
  'demography', 'education', 'health', 'economy', 'industry', 'connectivity',
  'geography', 'environment'
);
CREATE TYPE indicator_scope AS ENUM ('state', 'district', 'village');

CREATE TYPE alert_type AS ENUM ('weather', 'river', 'flood', 'road', 'disaster');
CREATE TYPE alert_severity AS ENUM ('minor', 'moderate', 'severe', 'extreme', 'unknown');
CREATE TYPE alert_urgency AS ENUM ('immediate', 'expected', 'future', 'past', 'unknown');
CREATE TYPE alert_certainty AS ENUM ('observed', 'likely', 'possible', 'unlikely', 'unknown');
CREATE TYPE alert_status AS ENUM ('active', 'expired', 'cancelled', 'superseded');

CREATE TYPE station_type AS ENUM ('weather', 'river', 'reservoir');
CREATE TYPE threshold_level AS ENUM ('warning', 'danger', 'hfl');

CREATE TYPE metric AS ENUM (
  'temperature_c', 'rainfall_mm', 'humidity_pct',
  'river_level_m', 'reservoir_level_m', 'reservoir_storage_mcm',
  'wind_speed_kmh', 'wind_direction_deg', 'weather_code',
  'temperature_min_c', 'temperature_max_c',
  'pm2_5_ug_m3', 'pm10_ug_m3', 'us_aqi',
  'nitrogen_dioxide_ug_m3', 'ozone_ug_m3', 'sulphur_dioxide_ug_m3', 'carbon_monoxide_ug_m3'
);

CREATE TYPE road_network AS ENUM ('NH', 'SH');

/*
 * `updated_at` maintenance.
 *
 * MySQL keeps this current with `ON UPDATE CURRENT_TIMESTAMP` on the column. Postgres has
 * no such clause, so one trigger function serves every table that needs it — defined once
 * here rather than repeated per table.
 *
 * Timestamps are `timestamp` (no zone), not `timestamptz`, deliberately. Every timestamp in
 * this system is UTC by contract and is converted at the edges by `toIsoUtc`; a timestamptz
 * would invite the database to apply a session zone and reintroduce exactly the silent
 * shifts that contract exists to prevent.
 */
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = (now() AT TIME ZONE 'utc');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ROLLBACK
-- DROP FUNCTION IF EXISTS set_updated_at();
-- DROP TYPE IF EXISTS road_network, metric, threshold_level, station_type,
--   alert_status, alert_certainty, alert_urgency, alert_severity, alert_type,
--   indicator_scope, indicator_category, run_status, metadata_status, cadence,
--   access_method, division, area_type;
