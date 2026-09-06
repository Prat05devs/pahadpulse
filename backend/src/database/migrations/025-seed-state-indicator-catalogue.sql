-- 024 — state-scoped indicators, for the "Uttarakhand at a glance" panel.
--
-- Migration 007 catalogued ten indicators and noted that all of them are district-scoped,
-- with state scope "schema-supported but not yet catalogued". That gap is why the state
-- panel's six figures were hardcoded in the WEB APP instead of coming from this module —
-- there was nothing here for them to come from. These five rows close it.
--
-- SEPARATE KEYS from the district indicators, not a scope change to them. `indicator_key`
-- is unique and scope is a property of the indicator, so `population` cannot be both
-- district- and state-scoped. Renaming or re-scoping the existing rows would break every
-- district value that references them, so the state versions get their own keys.
--
-- The sixth figure on that panel, the district COUNT, is deliberately not catalogued: it is
-- already derived by counting the rows the geography module returns, which cannot drift
-- from the district list the way a stored copy of "13" could.

INSERT INTO indicators
  (indicator_key, category, scope, label_en, label_hi, unit, decimals, higher_is_better)
VALUES
  ('state_population', 'demography', 'state',
   'Population', 'जनसंख्या', 'count', 0, NULL),

  ('state_area_sq_km', 'geography', 'state',
   'Area', 'क्षेत्रफल', 'sq_km', 0, NULL),

  ('state_literacy_rate', 'demography', 'state',
   'Literacy Rate', 'साक्षरता दर', 'percent', 2, TRUE),

  ('state_villages', 'demography', 'state',
   'Villages', 'गांव', 'count', 0, NULL),

  ('state_forest_cover_pct', 'environment', 'state',
   'Forest Cover', 'वन आवरण', 'percent', 2, TRUE)
AS new
ON DUPLICATE KEY UPDATE
  category         = new.category,
  scope            = new.scope,
  label_en         = new.label_en,
  label_hi         = new.label_hi,
  unit             = new.unit,
  decimals         = new.decimals,
  higher_is_better = new.higher_is_better;

-- ROLLBACK
-- DELETE FROM indicators WHERE indicator_key IN (
--   'state_population', 'state_area_sq_km', 'state_literacy_rate',
--   'state_villages', 'state_forest_cover_pct');
