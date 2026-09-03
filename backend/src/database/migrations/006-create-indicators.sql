-- 006 — the indicator catalogue and the value fact table.
--
-- One shape — this indicator, for this area, at this vintage, from this source — serves the
-- state overview, every district dashboard, the two-district comparison, and trend views.
-- The specification lists demography, education, health, economy, industry and connectivity
-- as separate features; they share this one shape, so category is a column, not a module
-- split. See project/modules/indicators.md.

CREATE TABLE IF NOT EXISTS indicators (
  id                INT AUTO_INCREMENT PRIMARY KEY,

  -- Stable machine key, e.g. 'literacy_rate'. Referenced by indicator_values.indicator_key,
  -- never by this numeric id — the fact table's PK is (indicator_key, area_id, vintage).
  indicator_key     VARCHAR(64) NOT NULL,

  category          ENUM('demography','education','health','economy','industry','connectivity') NOT NULL,

  -- Which area type this indicator's values attach to.
  scope             ENUM('state','district','village') NOT NULL,

  label_en          VARCHAR(255) NOT NULL,
  label_hi          VARCHAR(255) NOT NULL,

  unit              VARCHAR(32) NOT NULL,
  decimals          TINYINT UNSIGNED NOT NULL DEFAULT 0,

  -- Nullable on purpose: literacy rate has a direction, population does not, and a
  -- comparison view that colours population green is meaningless.
  higher_is_better  BOOLEAN NULL,

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_indicator_key (indicator_key),
  KEY idx_indicator_category (category, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- The fact table. Composite PK enforces IND-1 (idempotent upsert by indicator + area + vintage)
-- at the schema level, not just by convention.
CREATE TABLE IF NOT EXISTS indicator_values (
  indicator_key     VARCHAR(64) NOT NULL,
  area_id           INT NOT NULL,

  -- What the value DESCRIBES, not when we fetched it (DS-2). Always required (IND-2) —
  -- a census figure from 2011 must never read as current.
  vintage           DATE NOT NULL,

  value             DECIMAL(20,4) NOT NULL,

  -- Provenance (DS-1): every value names its source and when we retrieved it. All three
  -- are NOT NULL — a value that cannot name its source is not stored.
  source_id         INT NOT NULL,
  fetched_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (indicator_key, area_id, vintage),

  CONSTRAINT fk_values_indicator
    FOREIGN KEY (indicator_key) REFERENCES indicators(indicator_key)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_values_area
    FOREIGN KEY (area_id) REFERENCES areas(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_values_source
    FOREIGN KEY (source_id) REFERENCES sources(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  -- District dashboard: latest value per indicator for one area. Covers the filter AND
  -- the vintage ordering together (guidelines/backend/12-pagination.md §6).
  KEY idx_value_area_key_vintage (area_id, indicator_key, vintage DESC),

  -- Rankings and the state overview: all areas' values for one indicator at one vintage.
  KEY idx_value_key_vintage_value (indicator_key, vintage, value DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ROLLBACK
-- DROP TABLE IF EXISTS indicator_values;
-- DROP TABLE IF EXISTS indicators;
