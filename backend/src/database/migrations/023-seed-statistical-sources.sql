-- 013 — the two statistical sources behind the first real district figures.
--
-- Both are `manual` access: a person read a published table and transcribed it, which
-- datasets.md §3 names explicitly as a legitimate ingestion method provided it carries the
-- same provenance as an API. Neither publishes a machine-readable endpoint today. When the
-- data.gov.in key lands, the Census tables become an `api` source and this row's
-- access_method changes — the values already stored do not.

INSERT INTO sources
  (source_key, owner_module, department_en, department_hi, url, attribution, licence,
   access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
VALUES
  (
    'census-2011',
    'indicators',
    'Office of the Registrar General & Census Commissioner, India',
    'भारत के महारजिस्ट्रार एवं जनगणना आयुक्त का कार्यालय',
    'https://censusindia.gov.in',
    'Source: Census of India 2011, Office of the Registrar General & Census Commissioner, India',
    'Government Open Data Licence — India (GODL)',
    'manual',
    -- The census is decennial. `static` rather than `annual` because these figures are not
    -- expected to change at all — a 2011 figure is final. Marking them `annual` would have
    -- the freshness rule declare every value expired, which is wrong: the data is old by
    -- nature, not stale.
    'static',
    TRUE,
    'provisional',
    'Population, literacy rate and sex ratio for all 13 districts, Census 2011 final totals. Transcribed 2026-09-05 and validated by checking that the 13 district populations sum to the published state total of 10,086,292. Vintage is the Census reference date of 1 March 2011 — these figures are 15 years old and every surface must show that rather than imply currency.',
    TRUE
  ),
  (
    'uk-des-ddp',
    'indicators',
    'Directorate of Economics & Statistics, Government of Uttarakhand',
    'अर्थ एवं संख्या निदेशालय, उत्तराखण्ड सरकार',
    'https://des.uk.gov.in',
    'Source: District Domestic Product of Uttarakhand, Directorate of Economics & Statistics, Government of Uttarakhand',
    'Government of Uttarakhand published report',
    'manual',
    'annual',
    TRUE,
    'provisional',
    'Per capita income (per capita NDDP at current prices), New Series base year 2011-12, Table L of the District Domestic Product of Uttarakhand report. Eleven vintages per district, 2011-12 to 2021-22. Figures for 2020-21 and 2021-22 are the department''s own provisional estimates. Transcribed from the department PDF rather than press coverage — a syndicated news table of the same release prints Pithoragarh with a dropped digit.',
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

-- ROLLBACK
-- DELETE FROM sources WHERE source_key IN ('census-2011', 'uk-des-ddp');
