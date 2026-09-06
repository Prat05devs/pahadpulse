-- 008 — observed earthquakes. See project/modules/seismic.md.
--
-- NOT in `alerts`: that table models time-bounded warnings issued by an authority, and an
-- earthquake record is a measurement of something that already happened. Filing it there
-- would either show a three-week-old tremor as an active alert, or require inventing an
-- expires_at the source never stated, which ALR-3 forbids.

CREATE TABLE seismic_events (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  source_id         INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  -- USGS's own event id. Upsert key: USGS revises magnitude and depth for hours after an
  -- event, and a revision must REPLACE our row rather than add an earthquake that never was.
  source_event_id   VARCHAR(128) NOT NULL,

  magnitude         NUMERIC(4,2) NOT NULL,
  -- mb, ml, mw are not interchangeable, so the scale is recorded rather than implied.
  magnitude_type    VARCHAR(16),
  -- Kilometres below the surface: what separates a damaging shallow quake from a deep rumble.
  depth_km          NUMERIC(7,2),

  -- USGS's own place string, verbatim. Not re-derived into our district names — that would
  -- be us asserting a location the source did not state (SEI-5).
  place             VARCHAR(512) NOT NULL,
  epicentre         geography(Point, 4326) NOT NULL,

  -- When the ground moved. This is what the record DESCRIBES and fills the vintage role.
  occurred_at       TIMESTAMP NOT NULL,

  -- `automatic` is an unreviewed machine solution that may be revised. Displayed (SEI-4).
  review_status     VARCHAR(32),
  web_url           VARCHAR(2048),

  fetched_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  created_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  CONSTRAINT uq_seismic_source_event UNIQUE (source_id, source_event_id)
);

CREATE INDEX idx_seismic_occurred ON seismic_events (occurred_at DESC, magnitude);
CREATE INDEX idx_seismic_epicentre ON seismic_events USING GIST (epicentre);

CREATE TRIGGER seismic_events_updated_at BEFORE UPDATE ON seismic_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ROLLBACK
-- DROP TABLE IF EXISTS seismic_events;
