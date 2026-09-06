-- 003 — the source registry and ingestion run log.
--
-- This is the spine every other module hangs provenance from (DS-1): no domain value is
-- displayed unless it can name the source it came from and when it was fetched.
-- See project/modules/datasets.md.

CREATE TABLE sources (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_key        VARCHAR(64) NOT NULL UNIQUE,
  owner_module      VARCHAR(64) NOT NULL,
  department_en     VARCHAR(255) NOT NULL,
  department_hi     VARCHAR(255) NOT NULL,
  url               VARCHAR(2048) NOT NULL,
  attribution       VARCHAR(512) NOT NULL,
  licence           VARCHAR(255) NOT NULL,
  access_method     access_method NOT NULL,
  cadence           cadence NOT NULL,
  -- DS-6: access is not redistribution. FALSE means ingest but never display.
  may_redistribute  BOOLEAN NOT NULL DEFAULT FALSE,
  metadata_status   metadata_status NOT NULL DEFAULT 'provisional',
  metadata_note     VARCHAR(1024),
  is_enabled        BOOLEAN NOT NULL DEFAULT TRUE,

  created_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX idx_source_owner ON sources (owner_module, id);
CREATE INDEX idx_source_redistributable ON sources (may_redistribute, id);

CREATE TRIGGER sources_updated_at BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- DS-3: freshness is computed from the last SUCCESSFUL run, never stored. DS-4: a failed
-- run records the failure and leaves the data alone.
CREATE TABLE ingestion_runs (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id         INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  started_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  finished_at       TIMESTAMP,
  status            run_status NOT NULL DEFAULT 'running',
  rows_written      INTEGER NOT NULL DEFAULT 0,
  rows_rejected     INTEGER NOT NULL DEFAULT 0,
  error_code        INTEGER,
  notes             VARCHAR(1024),
  -- What the fetched data DESCRIBES, not when it was fetched (DS-2).
  vintage           DATE,
  triggered_by      VARCHAR(64) NOT NULL DEFAULT 'scheduler',

  created_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX idx_run_source_status_started ON ingestion_runs (source_id, status, started_at DESC);
CREATE INDEX idx_run_source_started ON ingestion_runs (source_id, started_at DESC);
CREATE INDEX idx_run_started ON ingestion_runs (started_at DESC, id DESC);

-- ROLLBACK
-- DROP TABLE IF EXISTS ingestion_runs, sources;
