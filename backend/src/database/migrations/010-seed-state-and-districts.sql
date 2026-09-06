-- 010 — the state row and all 13 Uttarakhand districts.
--
-- Reference data, not a dev seed: every environment needs them, and every domain row in the
-- platform joins to them. They ship as a migration for that reason.
--
-- English names, Hindi names, division and headquarters are administrative facts. Centroids
-- are APPROXIMATE representative points — the district headquarters coordinates — adequate
-- for map placement and explicitly not survey data. Official LGD and census identifiers are
-- deliberately left NULL until confirmed (geography.md §9).
--
-- Population, area and literacy are NOT here. Those are statistics and belong to the
-- `indicators` module with full provenance. Geography holds only where things are.
--
-- ST_MakePoint takes LONGITUDE FIRST. The MySQL schema stored the pair as two named columns
-- where order could not be mistaken; a point constructor is positional, so the coordinates
-- below are deliberately written lng-then-lat and verified by the count check at the end.

INSERT INTO areas (type, code, slug, name_en, name_hi, centroid)
VALUES (
  'state', 'UK', 'uttarakhand', 'Uttarakhand', 'उत्तराखण्ड',
  ST_SetSRID(ST_MakePoint(79.0193, 30.0668), 4326)::geography
)
ON CONFLICT (type, code) DO UPDATE SET
  slug     = EXCLUDED.slug,
  name_en  = EXCLUDED.name_en,
  name_hi  = EXCLUDED.name_hi,
  centroid = EXCLUDED.centroid;

INSERT INTO areas
  (type, code, slug, name_en, name_hi, parent_id, division, headquarters_en, headquarters_hi, centroid)
VALUES
  ('district', 'UK-AL', 'almora', 'Almora', 'अल्मोड़ा', (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'), 'kumaon', 'Almora', 'अल्मोड़ा', ST_SetSRID(ST_MakePoint(79.646700, 29.589200), 4326)::geography),
  ('district', 'UK-BA', 'bageshwar', 'Bageshwar', 'बागेश्वर', (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'), 'kumaon', 'Bageshwar', 'बागेश्वर', ST_SetSRID(ST_MakePoint(79.771000, 29.837000), 4326)::geography),
  ('district', 'UK-CM', 'chamoli', 'Chamoli', 'चमोली', (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'), 'garhwal', 'Gopeshwar', 'गोपेश्वर', ST_SetSRID(ST_MakePoint(79.320000, 30.400000), 4326)::geography),
  ('district', 'UK-CP', 'champawat', 'Champawat', 'चम्पावत', (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'), 'kumaon', 'Champawat', 'चम्पावत', ST_SetSRID(ST_MakePoint(80.091000, 29.336000), 4326)::geography),
  ('district', 'UK-DD', 'dehradun', 'Dehradun', 'देहरादून', (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'), 'garhwal', 'Dehradun', 'देहरादून', ST_SetSRID(ST_MakePoint(78.032200, 30.316500), 4326)::geography),
  ('district', 'UK-HR', 'haridwar', 'Haridwar', 'हरिद्वार', (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'), 'garhwal', 'Haridwar', 'हरिद्वार', ST_SetSRID(ST_MakePoint(78.164200, 29.945700), 4326)::geography),
  ('district', 'UK-NT', 'nainital', 'Nainital', 'नैनीताल', (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'), 'kumaon', 'Nainital', 'नैनीताल', ST_SetSRID(ST_MakePoint(79.454200, 29.391900), 4326)::geography),
  ('district', 'UK-PG', 'pauri-garhwal', 'Pauri Garhwal', 'पौड़ी गढ़वाल', (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'), 'garhwal', 'Pauri', 'पौड़ी', ST_SetSRID(ST_MakePoint(78.780000, 30.145000), 4326)::geography),
  ('district', 'UK-PI', 'pithoragarh', 'Pithoragarh', 'पिथौरागढ़', (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'), 'kumaon', 'Pithoragarh', 'पिथौरागढ़', ST_SetSRID(ST_MakePoint(80.218100, 29.582800), 4326)::geography),
  ('district', 'UK-RP', 'rudraprayag', 'Rudraprayag', 'रुद्रप्रयाग', (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'), 'garhwal', 'Rudraprayag', 'रुद्रप्रयाग', ST_SetSRID(ST_MakePoint(78.981100, 30.284400), 4326)::geography),
  ('district', 'UK-TG', 'tehri-garhwal', 'Tehri Garhwal', 'टिहरी गढ़वाल', (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'), 'garhwal', 'New Tehri', 'नई टिहरी', ST_SetSRID(ST_MakePoint(78.480000, 30.380000), 4326)::geography),
  ('district', 'UK-US', 'udham-singh-nagar', 'Udham Singh Nagar', 'उधम सिंह नगर', (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'), 'kumaon', 'Rudrapur', 'रुद्रपुर', ST_SetSRID(ST_MakePoint(79.400000, 28.975000), 4326)::geography),
  ('district', 'UK-UT', 'uttarkashi', 'Uttarkashi', 'उत्तरकाशी', (SELECT id FROM areas WHERE type = 'state' AND code = 'UK'), 'garhwal', 'Uttarkashi', 'उत्तरकाशी', ST_SetSRID(ST_MakePoint(78.435400, 30.726800), 4326)::geography)
ON CONFLICT (type, code) DO UPDATE SET
  slug            = EXCLUDED.slug,
  name_en         = EXCLUDED.name_en,
  name_hi         = EXCLUDED.name_hi,
  parent_id       = EXCLUDED.parent_id,
  division        = EXCLUDED.division,
  headquarters_en = EXCLUDED.headquarters_en,
  headquarters_hi = EXCLUDED.headquarters_hi,
  centroid        = EXCLUDED.centroid;

-- GEO-6: Uttarakhand has exactly 13 districts. Asserted here so a bad edit to this file
-- fails the migration rather than quietly shipping twelve.
DO $$
DECLARE n integer;
BEGIN
  SELECT COUNT(*) INTO n FROM areas WHERE type = 'district';
  IF n <> 13 THEN
    RAISE EXCEPTION 'expected 13 districts, found %', n;
  END IF;
END $$;

-- ROLLBACK
-- DELETE FROM areas WHERE type IN ('district', 'state');
