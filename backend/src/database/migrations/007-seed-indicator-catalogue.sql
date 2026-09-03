-- 007 — the indicator catalogue.
--
-- Reference metadata, not data: these ten rows describe WHAT can be measured (key, category,
-- bilingual label, unit, precision, direction), never a measured VALUE. That is why this ships
-- as a migration like the district list (002) and the map layer registry (003), while the
-- demo VALUES for these indicators are dev-only seed data — see scripts/seed.ts.
--
-- All ten are district-scoped for v1, matching the district-level demo data this module ships
-- with today. State- and village-scoped indicators are schema-supported but not yet catalogued.
--
-- This is a STARTING catalogue, not the confirmed v1 set — see indicators.md §9 (the full v1
-- catalogue is an open question). Extending it later is adding a row, not a migration change.

INSERT INTO indicators
  (indicator_key, category, scope, label_en, label_hi, unit, decimals, higher_is_better)
VALUES
  ('population', 'demography', 'district',
   'Population', 'जनसंख्या', 'count', 0, NULL),

  ('literacy_rate', 'demography', 'district',
   'Literacy Rate', 'साक्षरता दर', 'percent', 1, TRUE),

  ('sex_ratio', 'demography', 'district',
   'Sex Ratio', 'लिंगानुपात', 'females_per_1000_males', 0, NULL),

  ('schools_count', 'education', 'district',
   'Schools', 'विद्यालय', 'count', 0, TRUE),

  ('school_enrollment_rate', 'education', 'district',
   'School Enrollment Rate', 'विद्यालय नामांकन दर', 'percent', 1, TRUE),

  ('health_facilities_count', 'health', 'district',
   'Health Facilities', 'स्वास्थ्य सुविधाएं', 'count', 0, TRUE),

  ('hospital_beds_per_1000', 'health', 'district',
   'Hospital Beds per 1,000 Population', 'प्रति 1,000 जनसंख्या अस्पताल बिस्तर', 'per_1000_population', 2, TRUE),

  ('per_capita_income', 'economy', 'district',
   'Per-Capita Income', 'प्रति व्यक्ति आय', 'inr', 0, TRUE),

  ('registered_industries_count', 'industry', 'district',
   'Registered Industries', 'पंजीकृत उद्योग', 'count', 0, TRUE),

  ('internet_penetration_pct', 'connectivity', 'district',
   'Internet Penetration', 'इंटरनेट प्रवेश', 'percent', 1, TRUE)
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
--   'population','literacy_rate','sex_ratio','schools_count','school_enrollment_rate',
--   'health_facilities_count','hospital_beds_per_1000','per_capita_income',
--   'registered_industries_count','internet_penetration_pct'
-- );
