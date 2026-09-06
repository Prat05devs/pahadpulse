-- 005 — alerts: time-bounded warnings issued by authorities, and the areas they affect.
--
-- The module where correctness matters most. Everything else on the platform is
-- information; this is safety information. See project/modules/alerts.md.
--
-- `vintage` note: DS-1 requires every domain value to carry source_id, vintage and
-- fetched_at. An alert is event-shaped rather than measurement-shaped, so `issued_at`
-- (cap:sent — when the authority issued it) fills vintage's role.

CREATE TABLE alerts (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  source_id         INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  -- The source's own identifier (CAP's cap:identifier). Upsert key (ALR-1): a revised
  -- warning replaces ours, it never creates a second contradictory one.
  source_alert_id   VARCHAR(255) NOT NULL,

  type              alert_type NOT NULL,
  severity          alert_severity NOT NULL DEFAULT 'unknown',
  urgency           alert_urgency NOT NULL DEFAULT 'unknown',
  certainty         alert_certainty NOT NULL DEFAULT 'unknown',
  status            alert_status NOT NULL DEFAULT 'active',

  headline          VARCHAR(512) NOT NULL,
  body              TEXT NOT NULL,
  instruction       TEXT,

  -- Stored in the source's language and never translated (ALR-2).
  language          VARCHAR(8) NOT NULL DEFAULT 'en',

  authority         VARCHAR(255) NOT NULL,
  web_url           VARCHAR(2048),

  /*
   * The affected-area polygon, as real geometry.
   *
   * Nullable and frequently null: SACHET's polygon endpoint returns 403, and many sources
   * state their area only in prose. The map falls back to the districts the alert names —
   * see map.controller's `toGeometry`.
   */
  geom              geometry(MultiPolygon, 4326),
  centroid          geography(Point, 4326),

  -- What the alert DESCRIBES — cap:sent. Fills the vintage role.
  issued_at         TIMESTAMP NOT NULL,
  -- cap:onset. Nullable: not every CAP message states one.
  effective_from    TIMESTAMP,
  -- cap:expires. Nullable and deliberately so: a source that omits an expiry gets no
  -- fabricated one (ALR-3 evaluates this at read time).
  expires_at        TIMESTAMP,

  fetched_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  created_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  CONSTRAINT uq_alert_source UNIQUE (source_id, source_alert_id)
);

CREATE INDEX idx_alert_active ON alerts (status, expires_at, severity);
CREATE INDEX idx_alert_issued ON alerts (issued_at DESC);
CREATE INDEX idx_alert_geom ON alerts USING GIST (geom);

CREATE TRIGGER alerts_updated_at BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- One alert can affect many areas; an area can have many active alerts.
CREATE TABLE alert_areas (
  alert_id          INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  area_id           INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  PRIMARY KEY (alert_id, area_id)
);

-- "Active alerts for this district" — the district page's own lookup.
CREATE INDEX idx_alert_areas_area ON alert_areas (area_id, alert_id);

-- ROLLBACK
-- DROP TABLE IF EXISTS alert_areas, alerts;
