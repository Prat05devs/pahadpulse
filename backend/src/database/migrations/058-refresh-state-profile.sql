-- 058 — current, method-labelled state profile figures.
--
-- Census 2011 remains the latest completed population census and is intentionally retained
-- as history. This migration adds newer official products under separate indicator keys so
-- a projection or sample survey can never be mistaken for a Census enumeration.

INSERT INTO sources
  (source_key, owner_module, department_en, department_hi, url, attribution, licence,
   access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
VALUES
  (
    'mohfw-population-projections', 'indicators',
    'National Commission on Population, Ministry of Health and Family Welfare',
    'राष्ट्रीय जनसंख्या आयोग, स्वास्थ्य और परिवार कल्याण मंत्रालय',
    'https://cbhidghs.mohfw.gov.in/sites/default/files/NHP/NHP-2023-Last-Final.pdf',
    'Source: National Health Profile 2023 population-projection table, Ministry of Health and Family Welfare',
    'Government publication; factual table reproduced with attribution.',
    'manual', 'annual', TRUE, 'provisional',
    'The value is a modelled population projection based on Census 2011, not a new headcount. Uttarakhand 2026 is the report''s 1 March projection in thousands, converted to persons.',
    TRUE
  ),
  (
    'mospi-plfs-2023-24', 'indicators',
    'National Statistical Office, Ministry of Statistics and Programme Implementation',
    'राष्ट्रीय सांख्यिकी कार्यालय, सांख्यिकी और कार्यक्रम कार्यान्वयन मंत्रालय',
    'https://mospi.gov.in/sites/default/files/publication_reports/AnnualReport_PLFS2023-24L2.pdf',
    'Source: Periodic Labour Force Survey Annual Report 2023–24, NSO',
    'Government publication; factual table reproduced with attribution.',
    'manual', 'annual', TRUE, 'provisional',
    'Sample-survey estimate for literacy among people aged seven and above. It is not directly interchangeable with a decennial Census count.',
    TRUE
  ),
  (
    'uk-current-state-profile', 'indicators',
    'Government of Uttarakhand',
    'उत्तराखण्ड सरकार',
    'https://swajal.uk.gov.in/upload/announcements/Announcement-30.pdf',
    'Source: Government of Uttarakhand administrative state profile',
    'Government publication; factual profile figures reproduced with attribution.',
    'manual', 'annual', TRUE, 'provisional',
    'Administrative village count and geographical area are from a recent state master-plan profile. Administrative villages are not the same measure as Census inhabited villages.',
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

INSERT INTO indicators
  (indicator_key, category, scope, label_en, label_hi, unit, decimals, higher_is_better)
VALUES
  ('state_population_projection', 'demography', 'state',
   'Projected Population', 'अनुमानित जनसंख्या', 'count', 0, NULL),
  ('state_literacy_plfs', 'demography', 'state',
   'Literacy Rate (PLFS)', 'साक्षरता दर (पीएलएफएस)', 'percent', 1, TRUE),
  ('state_administrative_villages', 'geography', 'state',
   'Administrative Villages', 'प्रशासनिक गांव', 'count', 0, NULL)
ON CONFLICT (indicator_key) DO UPDATE SET
  category = EXCLUDED.category,
  scope = EXCLUDED.scope,
  label_en = EXCLUDED.label_en,
  label_hi = EXCLUDED.label_hi,
  unit = EXCLUDED.unit,
  decimals = EXCLUDED.decimals,
  higher_is_better = EXCLUDED.higher_is_better;

INSERT INTO indicator_values (indicator_key, area_id, vintage, value, source_id, fetched_at)
VALUES
  ('state_population_projection',
   (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'),
   DATE '2026-03-01', 11993000,
   (SELECT id FROM sources WHERE source_key = 'mohfw-population-projections'),
   (now() AT TIME ZONE 'utc')),
  ('state_literacy_plfs',
   (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'),
   DATE '2024-06-30', 83.8,
   (SELECT id FROM sources WHERE source_key = 'mospi-plfs-2023-24'),
   (now() AT TIME ZONE 'utc')),
  ('state_administrative_villages',
   (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'),
   DATE '2024-01-01', 16916,
   (SELECT id FROM sources WHERE source_key = 'uk-current-state-profile'),
   (now() AT TIME ZONE 'utc')),
  ('state_area_sq_km',
   (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'),
   DATE '2025-02-18', 53483,
   (SELECT id FROM sources WHERE source_key = 'uk-current-state-profile'),
   (now() AT TIME ZONE 'utc')),
  ('state_forest_cover_pct',
   (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'),
   DATE '2023-01-01', 45.44,
   (SELECT id FROM sources WHERE source_key = 'forest-survey-india'),
   (now() AT TIME ZONE 'utc'))
ON CONFLICT (indicator_key, area_id, vintage) DO UPDATE SET
  value = EXCLUDED.value,
  source_id = EXCLUDED.source_id,
  fetched_at = EXCLUDED.fetched_at;

UPDATE sources
   SET url = 'https://fsi.nic.in/uploads/isfr2023/isfr_book_eng-vol-2_2023.pdf',
       metadata_note = 'Uttarakhand forest cover is from ISFR 2023 Volume II: 24,303.83 km², or 45.44% of the 53,483.36 km² calculated area.',
       updated_at = (now() AT TIME ZONE 'utc')
 WHERE source_key = 'forest-survey-india';

-- ROLLBACK
-- DELETE FROM indicator_values WHERE indicator_key IN
--   ('state_population_projection', 'state_literacy_plfs', 'state_administrative_villages')
--   OR (indicator_key = 'state_area_sq_km' AND vintage = DATE '2025-02-18')
--   OR (indicator_key = 'state_forest_cover_pct' AND vintage = DATE '2023-01-01');
-- DELETE FROM indicators WHERE indicator_key IN
--   ('state_population_projection', 'state_literacy_plfs', 'state_administrative_villages');
-- DELETE FROM sources WHERE source_key IN
--   ('mohfw-population-projections', 'mospi-plfs-2023-24', 'uk-current-state-profile');
