-- 004 — the source registry and the ingestion audit trail.
--
-- `datasets` stores no domain values. It owns where data came from and whether it can be
-- trusted right now. Every domain table added later carries source_id + vintage + fetched_at,
-- all NOT NULL (DS-1) — a value that cannot name its source is not stored.
--
-- See project/modules/datasets.md.

CREATE TABLE IF NOT EXISTS sources (
  id                INT AUTO_INCREMENT PRIMARY KEY,

  -- Stable machine key. Connectors resolve themselves by this at startup.
  source_key        VARCHAR(64) NOT NULL,

  -- The module that owns this source. Exactly one owner per source (DS-7).
  owner_module      VARCHAR(64) NOT NULL,

  department_en     VARCHAR(255) NOT NULL,
  department_hi     VARCHAR(255) NOT NULL,

  -- The human-facing landing page a reader can open to verify the figure.
  url               VARCHAR(2048) NOT NULL,

  -- The exact credit string we are obliged to display. Never generated at render time.
  attribution       VARCHAR(512) NOT NULL,
  licence           VARCHAR(255) NOT NULL,

  access_method     ENUM('api','feed','bulk','manual') NOT NULL,
  cadence           ENUM('realtime','hourly','daily','monthly','annual','static') NOT NULL,

  -- Access is not redistribution (DS-6). Defaults to FALSE: a source is not publishable
  -- until someone has confirmed in writing that it may be.
  may_redistribute  BOOLEAN NOT NULL DEFAULT FALSE,

  -- 'provisional' until licence and redistribution terms are confirmed with the publishing
  -- body. Everything seeded ahead of that conversation is provisional.
  metadata_status   ENUM('provisional','verified') NOT NULL DEFAULT 'provisional',

  -- Operator-facing caveat: which terms still need confirming.
  metadata_note     VARCHAR(512) NULL,

  is_enabled        BOOLEAN NOT NULL DEFAULT TRUE,

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_source_key (source_key),
  KEY idx_source_owner (owner_module, id),
  KEY idx_source_redistributable (may_redistribute, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Append-only audit trail. A failed run never deletes or invalidates data (DS-4);
-- it only degrades freshness, which is computed from the last SUCCESSFUL run.
CREATE TABLE IF NOT EXISTS ingestion_runs (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  source_id         INT NOT NULL,

  started_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at       DATETIME NULL,

  status            ENUM('running','succeeded','failed','partial_success') NOT NULL DEFAULT 'running',
  rows_written      INT NOT NULL DEFAULT 0,
  rows_rejected     INT NOT NULL DEFAULT 0,

  -- The registry error code (90xxx) when the run failed. NULL on success.
  error_code        INT NULL,
  notes             VARCHAR(1024) NULL,

  -- What the data DESCRIBES, as reported by the connector — distinct from started_at,
  -- which is when we fetched it (DS-2).
  vintage           DATE NULL,

  -- 'scheduler', 'cli', or an operator identifier once `accounts` exists.
  triggered_by      VARCHAR(64) NOT NULL DEFAULT 'scheduler',

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_runs_source
    FOREIGN KEY (source_id) REFERENCES sources(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  -- "last successful run for this source" — the freshness query, on every page.
  KEY idx_run_source_status_started (source_id, status, started_at DESC),
  KEY idx_run_source_started (source_id, started_at DESC),
  KEY idx_run_started (started_at DESC, id DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ROLLBACK
-- DROP TABLE IF EXISTS ingestion_runs;
-- DROP TABLE IF EXISTS sources;
