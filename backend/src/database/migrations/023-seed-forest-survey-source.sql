-- 023 — Forest Survey of India, for the forest-cover figure on the state dashboard.
--
-- A new source row rather than reusing `census-2011`: forest cover is not a census product.
-- It is a remote-sensing assessment published biennially by a different body, on a different
-- cycle, with a different vintage — and DS-1 means the figure has to name the body that
-- actually produced it.
--
-- WHY THIS EXISTS AT ALL: the dashboard displayed "63% forest coverage" as a hardcoded
-- literal in the web app, with no source and no vintage. 63% matches neither of FSI's two
-- published measures — forest COVER (what satellites see, 45.44%) nor RECORDED FOREST AREA
-- (what is legally notified as forest, around 71%). It appears to have been neither
-- measured nor cited, which is exactly the class of number this registry exists to prevent.
--
-- `metadata_status` is provisional and the note says why: the figure seeded in 025 is from
-- ISFR 2019, which is the most recent Uttarakhand state figure that could be confirmed.
-- ISFR 2021 and 2023 have since been published and the state number should be read out of
-- the current report and updated. A correct 2019 figure that says 2019 is honest. A 2019
-- figure presented as current would not be.

INSERT INTO sources
  (source_key, owner_module, department_en, department_hi, url, attribution, licence,
   access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
VALUES
  (
    'forest-survey-india',
    'indicators',
    'Forest Survey of India, Ministry of Environment, Forest and Climate Change',
    'भारतीय वन सर्वेक्षण, पर्यावरण, वन और जलवायु परिवर्तन मंत्रालय',
    'https://fsi.nic.in',
    'Source: India State of Forest Report, Forest Survey of India',
    'Not confirmed',
    'manual',
    'annual',
    TRUE,
    'provisional',
    'Figure transcribed from the India State of Forest Report rather than fetched — FSI publishes the assessment as a report, not an API. Redistribution terms for ISFR figures have NOT been confirmed with FSI. The seeded value is the ISFR 2019 state figure. ISFR 2021 and 2023 exist and the number should be refreshed from the current report.',
    TRUE
  )
AS new
ON DUPLICATE KEY UPDATE
  owner_module     = new.owner_module,
  department_en    = new.department_en,
  department_hi    = new.department_hi,
  url              = new.url,
  attribution      = new.attribution,
  licence          = new.licence,
  access_method    = new.access_method,
  cadence          = new.cadence,
  may_redistribute = new.may_redistribute,
  metadata_status  = new.metadata_status,
  metadata_note    = new.metadata_note,
  is_enabled       = new.is_enabled;

-- ROLLBACK
-- DELETE FROM sources WHERE source_key = 'forest-survey-india';
