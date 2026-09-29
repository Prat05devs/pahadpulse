-- 068 — Satellite fire detections from NASA FIRMS. See project/modules/wildfire.md.
--
-- WHAT A ROW IS. One satellite pixel that a fire algorithm flagged as hotter than its
-- surroundings at one overpass. In Uttarakhand that is usually a forest fire, but it can be
-- a crop-residue burn, a controlled burn, or a hot industrial roof. It is an observation from
-- orbit, not a report from the ground. The columns keep the satellite's own confidence and
-- radiative power, so a reader can weigh one detection against another (WLD-2).
--
-- NOT IN `alerts`, for the reason 008 gives for earthquakes: a detection is a measurement of
-- something that already happened, and no authority issued it as a warning.
--
-- LICENCE. NASA's FIRMS FAQ (checked 2026-09-29): "no restrictions" on use of FIRMS data,
-- attributed as NASA FIRMS / LANCE / ESDIS. So `may_redistribute = TRUE`.

INSERT INTO sources
  (source_key, owner_module, department_en, department_hi, url, attribution, licence,
   access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
VALUES
  (
    'nasa-firms',
    'wildfire',
    'NASA Fire Information for Resource Management System (FIRMS)',
    'नासा अग्नि सूचना प्रणाली (FIRMS)',
    'https://firms.modaps.eosdis.nasa.gov',
    'Source: NASA LANCE FIRMS, part of NASA ESDIS',
    'Open data, no restrictions on use; attribution to NASA FIRMS requested',
    'api',
    'realtime',
    TRUE,
    'verified',
    'Near-real-time active-fire detections from VIIRS (NOAA-20, NOAA-21; 375 m) and MODIS (Terra, Aqua; 1 km), read through the FIRMS area API with a map key. A detection is a hot pixel seen from orbit, not a ground-verified fire, and may be a crop or controlled burn. Kept only when it falls inside a district boundary. Forest fires are officially reported by the Uttarakhand Forest Department, which should lead this source if it publishes a machine-readable feed.',
    TRUE
  )
ON CONFLICT (source_key) DO UPDATE SET
  owner_module     = EXCLUDED.owner_module,
  department_en    = EXCLUDED.department_en,
  department_hi    = EXCLUDED.department_hi,
  url              = EXCLUDED.url,
  attribution      = EXCLUDED.attribution,
  licence          = EXCLUDED.licence,
  access_method    = EXCLUDED.access_method,
  cadence          = EXCLUDED.cadence,
  may_redistribute = EXCLUDED.may_redistribute,
  metadata_status  = EXCLUDED.metadata_status,
  metadata_note    = EXCLUDED.metadata_note,
  is_enabled       = EXCLUDED.is_enabled;

CREATE TABLE fire_detections (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  source_id         INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  -- FIRMS has no detection id. This key is built from product, position, time and satellite,
  -- which together identify one pixel at one pass. Re-reading the same pass then updates
  -- the row instead of adding a second fire (DS-5).
  source_event_id   VARCHAR(128) NOT NULL,

  -- The district whose boundary covers the point, computed by ST_Covers at ingestion. NOT
  -- NULL on purpose: a detection outside every district is outside the state and not stored.
  area_id           INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,

  -- The FIRMS product, e.g. VIIRS_NOAA20_NRT. Resolution differs by product, so it is kept.
  sensor            VARCHAR(32) NOT NULL,
  satellite         VARCHAR(16) NOT NULL,
  instrument        VARCHAR(16) NOT NULL,

  -- VIIRS publishes l/n/h and MODIS publishes 0–100. Both are mapped to one scale for the
  -- map, and the published value is kept verbatim next to it.
  confidence        VARCHAR(8) NOT NULL CHECK (confidence IN ('low', 'nominal', 'high')),
  confidence_raw    VARCHAR(8) NOT NULL,

  -- Fire radiative power in megawatts: how much heat the fire gives off, and the best
  -- single measure of its size the satellite can provide.
  frp_mw            NUMERIC(9,2),
  -- Brightness temperature of the fire pixel, Kelvin (VIIRS I-4 / MODIS channel 21).
  brightness_k      NUMERIC(6,2),
  day_night         CHAR(1) CHECK (day_night IN ('D', 'N')),

  location          geography(Point, 4326) NOT NULL,
  -- When the satellite saw it. This is what the record DESCRIBES and fills the vintage role.
  acquired_at       TIMESTAMP NOT NULL,

  -- Set when a fire notification covered this detection, or when it was deliberately not
  -- announced (low confidence, too old, district in cooldown). NULL means "not considered".
  notified_at       TIMESTAMP,

  fetched_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  created_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  CONSTRAINT uq_fire_source_event UNIQUE (source_id, source_event_id)
);

CREATE INDEX idx_fire_acquired ON fire_detections (acquired_at DESC);
-- Keeps the notification pass cheap: it only ever reads rows nobody has considered yet.
CREATE INDEX idx_fire_unnotified ON fire_detections (area_id) WHERE notified_at IS NULL;

CREATE TRIGGER fire_detections_updated_at BEFORE UPDATE ON fire_detections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- When each district last got a fire notification. Used for the cooldown: at most one per
-- district per FIRE_PUSH.COOLDOWN_HOURS.
CREATE TABLE fire_district_notices (
  area_id           INTEGER PRIMARY KEY REFERENCES areas(id) ON DELETE CASCADE,
  notified_at       TIMESTAMP NOT NULL,
  detection_count   INTEGER NOT NULL
);

-- Same lockdown as every table since 055. The migration runner now enforces this too.
ALTER TABLE fire_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_district_notices ENABLE ROW LEVEL SECURITY;

-- ROLLBACK
-- DROP TABLE IF EXISTS fire_district_notices;
-- DROP TABLE IF EXISTS fire_detections;
-- DELETE FROM sources WHERE source_key = 'nasa-firms';
