-- 040 — district development index, tourism capacity, and the first real school and
-- hospital figures, all read out of the migration commission's reports.
--
-- WHY THESE LIVE IN `indicator_values` AND THE MIGRATION SURVEYS DO NOT.
--
-- Each of these IS one number per district per vintage, which is exactly what an indicator
-- is. The migration surveys are not — a composition of eight shares is not thirteen
-- indicators — which is why they got their own tables in 038 and these do not.
--
-- TWO NEW CATEGORIES.
--
-- `development` and `tourism` are added to `indicator_category`. Tourism is a module of this
-- product with no indicator category until now, and the SDG composite index is not an
-- economy figure — it scores health, education, equality and environment together, and
-- filing it under `economy` would misdescribe it in the one place a reader looks to
-- understand what they are seeing.
--
-- COVERAGE IS UNEVEN, ON PURPOSE.
--
-- The composite index and the tourism capacity table cover all thirteen districts. Schools
-- and hospital beds cover three — Almora, Pithoragarh and Pauri Garhwal are the districts
-- whose commission report is in English and carries a Directorate of Economics & Statistics
-- table. The other ten get no row rather than an estimate: the UI states that the figure is
-- still being compiled, which is true, and which a reader can act on. A fabricated number
-- looks identical to a real one and cannot be un-shown.
--
-- WHAT WAS DELIBERATELY NOT SEEDED.
--
-- `health_facilities_count` is not filled in, though all three reports appear to give it.
-- Pauri's table counts Community Health Centres in a column that Almora's and Pithoragarh's
-- tables do not have at all. Summing those into one "facilities" figure would rank Pauri
-- above the others partly for having a wider table, which is the precise error a district
-- comparison must not make. `hospital_beds` is seeded instead: all three publish it, and it
-- means the same thing in each. `hospital_beds_per_1000` is likewise skipped, because
-- dividing 2016-17 beds by a 2011 population silently invents a rate for neither year.

ALTER TYPE indicator_category ADD VALUE IF NOT EXISTS 'development';
ALTER TYPE indicator_category ADD VALUE IF NOT EXISTS 'tourism';


INSERT INTO sources
  (source_key, owner_module, department_en, department_hi, url, attribution, licence,
   access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
VALUES
  ('uk-district-composite-index', 'indicators',
   'Uttarakhand State SDG Composite Index',
   'उत्तराखण्ड राज्य एस.डी.जी. कम्पोजिट इंडेक्स',
   'https://palayanayog.uk.gov.in',
   'Government of Uttarakhand district SDG composite index, reproduced in the Rural Development and Migration Commission second interim report, February 2023',
   'Government of Uttarakhand report, reproduced with attribution.',
   'manual', 'annual', TRUE, 'provisional',
   'Transcribed from the commission''s February 2023 report, which reproduces the state''s district SDG composite index for 2015-16 to 2020-21. The commission is the document read; the index itself is the state''s. Score and rank are stored as separate indicators because a rank is not a measurement -- a district can improve its score and still fall a place.',
   TRUE),
  ('uk-tourism-capacity', 'tourism',
   'Uttarakhand Tourism Department',
   'उत्तराखण्ड पर्यटन विभाग',
   'https://uttarakhandtourism.gov.in',
   'Uttarakhand Tourism Department accommodation figures, reproduced in the Rural Development and Migration Commission second interim report, February 2023',
   'Government of Uttarakhand report, reproduced with attribution.',
   'manual', 'annual', TRUE, 'provisional',
   'District-wise accommodation capacity and Char Dham pilgrim arrivals, transcribed from the commission''s February 2023 report. Every column sums to the totals the report states for itself. The 2020 and 2021 pilgrim figures are pandemic years and fell roughly tenfold; they are stored as published rather than smoothed.',
   TRUE),
  ('uk-des-district-reports', 'indicators',
   'Directorate of Economics & Statistics, Uttarakhand',
   'अर्थ एवं संख्या निदेशालय, उत्तराखण्ड',
   'https://palayanayog.uk.gov.in',
   'Directorate of Economics & Statistics district figures, reproduced in the Rural Development and Migration Commission district reports',
   'Government of Uttarakhand report, reproduced with attribution.',
   'manual', 'annual', TRUE, 'provisional',
   'School and hospital bed counts transcribed from the commission''s per-district reports, each of which cites the Directorate of Economics & Statistics. Only Almora, Pithoragarh and Pauri Garhwal are covered: those are the district reports published in English with this table. The remaining ten districts get no row, so that the dashboard says the figure is being compiled rather than showing an estimate.',
   TRUE)
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

-- ROLLBACK
-- DELETE FROM sources WHERE source_key IN
--   ('uk-district-composite-index', 'uk-tourism-capacity', 'uk-des-district-reports');
