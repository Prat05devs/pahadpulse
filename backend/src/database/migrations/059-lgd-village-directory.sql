-- 059 — official LGD village directory provenance and import checkpoint.
--
-- Village names and their district/sub-district relationships are sourced from the
-- Ministry of Panchayati Raj's Local Government Directory, not inferred from map geometry.
-- The checked-in snapshot is imported by scripts/import-lgd-villages.ts after migrations.

CREATE TABLE reference_data_imports (
  dataset_key       VARCHAR(64) PRIMARY KEY,
  snapshot_sha256   VARCHAR(64) NOT NULL,
  source_vintage    DATE NOT NULL,
  row_count         INTEGER NOT NULL CHECK (row_count > 0),
  imported_at       TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

INSERT INTO sources
  (source_key, owner_module, department_en, department_hi, url, attribution, licence,
   access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
VALUES (
  'mopr-lgd-villages', 'geography',
  'Ministry of Panchayati Raj — Local Government Directory',
  'पंचायती राज मंत्रालय — स्थानीय शासन निर्देशिका',
  'https://www.data.gov.in/resource/local-government-directory-lgd-villages',
  'Source: Local Government Directory village dataset, Ministry of Panchayati Raj',
  'Government Open Data Licence - India (GODL); released through data.gov.in under NDSAP.',
  'bulk', 'monthly', TRUE, 'verified',
  'Canonical directory for village names, LGD codes and district/sub-district relationships. It does not provide village boundary geometry. The bundled snapshot contains 17,343 unique current village codes after four older duplicate-code records in the upstream export are superseded by their newest dated records.',
  TRUE
)
ON CONFLICT (source_key) DO UPDATE SET
  owner_module = EXCLUDED.owner_module,
  department_en = EXCLUDED.department_en,
  department_hi = EXCLUDED.department_hi,
  url = EXCLUDED.url,
  attribution = EXCLUDED.attribution,
  licence = EXCLUDED.licence,
  access_method = EXCLUDED.access_method,
  cadence = EXCLUDED.cadence,
  may_redistribute = EXCLUDED.may_redistribute,
  metadata_status = EXCLUDED.metadata_status,
  metadata_note = EXCLUDED.metadata_note,
  is_enabled = EXCLUDED.is_enabled;

UPDATE indicators
   SET label_en = 'Villages in LGD directory',
       label_hi = 'एलजीडी निर्देशिका में गांव'
 WHERE indicator_key = 'state_administrative_villages';

-- Supersede the older state-profile count without deleting it: readers can still inspect
-- the earlier vintage, while latest-value queries now select the official LGD snapshot.
INSERT INTO indicator_values (indicator_key, area_id, vintage, value, source_id, fetched_at)
VALUES (
  'state_administrative_villages',
  (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'),
  DATE '2026-04-21', 17343,
  (SELECT id FROM sources WHERE source_key = 'mopr-lgd-villages'),
  (now() AT TIME ZONE 'utc')
)
ON CONFLICT (indicator_key, area_id, vintage) DO UPDATE SET
  value = EXCLUDED.value,
  source_id = EXCLUDED.source_id,
  fetched_at = EXCLUDED.fetched_at;

REVOKE ALL ON TABLE reference_data_imports FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE reference_data_imports FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE reference_data_imports FROM authenticated';
  END IF;
END
$$;

-- ROLLBACK
-- DELETE FROM indicator_values WHERE indicator_key = 'state_administrative_villages'
--   AND vintage = DATE '2026-04-21';
-- DELETE FROM sources WHERE source_key = 'mopr-lgd-villages';
-- DROP TABLE IF EXISTS reference_data_imports;
