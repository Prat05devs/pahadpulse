-- 002 — the state row and all 13 Uttarakhand districts.
--
-- These are reference data, not a dev seed: every environment needs them, and every domain
-- row in the platform joins to them. They ship as a migration for that reason.
--
-- English names, Hindi names, division and headquarters are administrative facts.
-- Centroids are APPROXIMATE representative points (district headquarters coordinates),
-- adequate for map placement and explicitly not survey data. Official LGD and census
-- identifiers are deliberately left NULL until confirmed — see geography.md §9.
--
-- Population, area and literacy are NOT here. Those are statistics and belong to the
-- `indicators` module with full provenance. Geography holds only where things are.

SET @state_id = (SELECT id FROM areas WHERE type = 'state' AND code = 'UK');

INSERT INTO areas (type, code, slug, name_en, name_hi, parent_id, centroid_lat, centroid_lng)
SELECT 'state', 'UK', 'uttarakhand', 'Uttarakhand', 'उत्तराखंड', NULL, 30.066750, 79.019300
FROM DUAL
WHERE @state_id IS NULL;

SET @state_id = (SELECT id FROM areas WHERE type = 'state' AND code = 'UK');

INSERT INTO areas
  (type, code, slug, name_en, name_hi, parent_id, division, headquarters_en, headquarters_hi, centroid_lat, centroid_lng)
VALUES
  ('district', 'UK-AL', 'almora',            'Almora',            'अल्मोड़ा',        @state_id, 'kumaon',  'Almora',     'अल्मोड़ा',   29.589200, 79.646700),
  ('district', 'UK-BA', 'bageshwar',         'Bageshwar',         'बागेश्वर',        @state_id, 'kumaon',  'Bageshwar',  'बागेश्वर',   29.837000, 79.771000),
  ('district', 'UK-CM', 'chamoli',           'Chamoli',           'चमोली',          @state_id, 'garhwal', 'Gopeshwar',  'गोपेश्वर',   30.400000, 79.320000),
  ('district', 'UK-CP', 'champawat',         'Champawat',         'चम्पावत',        @state_id, 'kumaon',  'Champawat',  'चम्पावत',    29.336000, 80.091000),
  ('district', 'UK-DD', 'dehradun',          'Dehradun',          'देहरादून',        @state_id, 'garhwal', 'Dehradun',   'देहरादून',   30.316500, 78.032200),
  ('district', 'UK-HR', 'haridwar',          'Haridwar',          'हरिद्वार',        @state_id, 'garhwal', 'Haridwar',   'हरिद्वार',   29.945700, 78.164200),
  ('district', 'UK-NT', 'nainital',          'Nainital',          'नैनीताल',        @state_id, 'kumaon',  'Nainital',   'नैनीताल',    29.391900, 79.454200),
  ('district', 'UK-PG', 'pauri-garhwal',     'Pauri Garhwal',     'पौड़ी गढ़वाल',    @state_id, 'garhwal', 'Pauri',      'पौड़ी',      30.145000, 78.780000),
  ('district', 'UK-PI', 'pithoragarh',       'Pithoragarh',       'पिथौरागढ़',       @state_id, 'kumaon',  'Pithoragarh','पिथौरागढ़',  29.582800, 80.218100),
  ('district', 'UK-RP', 'rudraprayag',       'Rudraprayag',       'रुद्रप्रयाग',      @state_id, 'garhwal', 'Rudraprayag','रुद्रप्रयाग', 30.284400, 78.981100),
  ('district', 'UK-TG', 'tehri-garhwal',     'Tehri Garhwal',     'टिहरी गढ़वाल',    @state_id, 'garhwal', 'New Tehri',  'नई टिहरी',   30.380000, 78.480000),
  ('district', 'UK-US', 'udham-singh-nagar', 'Udham Singh Nagar', 'उधम सिंह नगर',   @state_id, 'kumaon',  'Rudrapur',   'रुद्रपुर',    28.975000, 79.400000),
  ('district', 'UK-UT', 'uttarkashi',        'Uttarkashi',        'उत्तरकाशी',       @state_id, 'garhwal', 'Uttarkashi', 'उत्तरकाशी',  30.726800, 78.435400)
AS new
ON DUPLICATE KEY UPDATE
  slug            = new.slug,
  name_en         = new.name_en,
  name_hi         = new.name_hi,
  parent_id       = new.parent_id,
  division        = new.division,
  headquarters_en = new.headquarters_en,
  headquarters_hi = new.headquarters_hi,
  centroid_lat    = new.centroid_lat,
  centroid_lng    = new.centroid_lng;

-- ROLLBACK
-- DELETE FROM areas WHERE type = 'district' AND code LIKE 'UK-%';
-- DELETE FROM areas WHERE type = 'state' AND code = 'UK';
