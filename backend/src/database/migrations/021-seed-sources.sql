-- 005 — the three sources available with no government approval.
--
-- These ship as a migration rather than a dev seed because the registry is reference data:
-- every environment needs the same source ids, and domain rows will hold foreign keys to them.
--
-- ALL THREE ARE `provisional`. Licence and redistribution terms were recorded from public
-- documentation and have NOT been confirmed with the publishing body. `may_redistribute`
-- gates public display (DS-6), so anything uncertain is FALSE until someone confirms it
-- in writing — see datasets.md §9.

INSERT INTO sources
  (source_key, owner_module, department_en, department_hi, url, attribution, licence,
   access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
VALUES
  (
    'data-gov-in',
    'indicators',
    'Open Government Data (OGD) Platform India',
    'ओपन गवर्नमेंट डेटा (ओजीडी) प्लेटफॉर्म इंडिया',
    'https://data.gov.in',
    'Source: data.gov.in, Government of India',
    'Government Open Data Licence — India (GODL)',
    'api',
    'annual',
    TRUE,
    'provisional',
    'GODL-India permits reuse with attribution per public documentation. Confirm scope for census, health and education catalogs before public launch. Requires a free API key.',
    TRUE
  ),
  (
    'imd-cap-alerts',
    'alerts',
    'India Meteorological Department',
    'भारत मौसम विज्ञान विभाग',
    'https://mausam.imd.gov.in',
    'Source: India Meteorological Department (IMD)',
    'Not confirmed',
    'feed',
    'realtime',
    FALSE,
    'provisional',
    'Public CAP feed, no key required. Redistribution rights NOT confirmed — may_redistribute stays FALSE, so alerts from this source are ingested but not publicly displayed until IMD confirms. This is the blocking question for the alerts module.',
    TRUE
  ),
  (
    'openstreetmap',
    'geography',
    'OpenStreetMap contributors',
    'ओपनस्ट्रीटमैप योगदानकर्ता',
    'https://www.openstreetmap.org',
    'Map data (c) OpenStreetMap contributors, ODbL',
    'Open Database License (ODbL) 1.0',
    'bulk',
    'monthly',
    TRUE,
    'provisional',
    'ODbL permits redistribution with attribution and share-alike. Attribution string must appear on every map surface. Confirm share-alike implications for derived boundary data.',
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
-- DELETE FROM sources WHERE source_key IN ('data-gov-in', 'imd-cap-alerts', 'openstreetmap');
