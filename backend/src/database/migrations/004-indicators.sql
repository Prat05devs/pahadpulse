-- 004 — the indicator catalogue and the value fact table.
--
-- One shape — this indicator, for this area, at this vintage, from this source — serves
-- the district page, the comparison view and the state profile.
-- See project/modules/indicators.md.

CREATE TABLE indicators (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Referenced by indicator_values.indicator_key, never by this numeric id.
  indicator_key     VARCHAR(64) NOT NULL UNIQUE,
  category          indicator_category NOT NULL,
  -- Which area type this indicator's values attach to.
  scope             indicator_scope NOT NULL,
  label_en          VARCHAR(255) NOT NULL,
  label_hi          VARCHAR(255) NOT NULL,
  unit              VARCHAR(32) NOT NULL,
  decimals          SMALLINT NOT NULL DEFAULT 0 CHECK (decimals >= 0 AND decimals <= 10),
  -- Nullable on purpose: literacy has a direction, population does not, and a comparison
  -- view that colours population green is meaningless.
  higher_is_better  BOOLEAN,

  created_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX idx_indicator_category ON indicators (category, id);

CREATE TRIGGER indicators_updated_at BEFORE UPDATE ON indicators
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE indicator_values (
  indicator_key     VARCHAR(64) NOT NULL REFERENCES indicators(indicator_key) ON DELETE RESTRICT,
  area_id           INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  -- What the value DESCRIBES, not when we fetched it (DS-2). Always required (IND-2).
  vintage           DATE NOT NULL,
  value             NUMERIC(20,4) NOT NULL,
  -- Provenance (DS-1): all three NOT NULL. A value that cannot name its source is not stored.
  source_id         INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  fetched_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  created_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  -- IND-1: idempotent upsert by indicator + area + vintage.
  PRIMARY KEY (indicator_key, area_id, vintage)
);

-- District dashboard: latest value per indicator for one area.
CREATE INDEX idx_value_area_key_vintage ON indicator_values (area_id, indicator_key, vintage DESC);
-- Rankings: all areas' values for one indicator at one vintage.
CREATE INDEX idx_value_key_vintage_value ON indicator_values (indicator_key, vintage, value DESC);

CREATE TRIGGER indicator_values_updated_at BEFORE UPDATE ON indicator_values
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ROLLBACK
-- DROP TABLE IF EXISTS indicator_values, indicators;
