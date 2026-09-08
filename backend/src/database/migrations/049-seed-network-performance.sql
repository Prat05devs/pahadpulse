-- 048 — the Ookla source, and Q2 2026 measurements for all thirteen districts.
--
-- LICENCE, AND WHY IT IS RECORDED RATHER THAN GLOSSED.
--
-- Speedtest open data is CC BY-NC-SA 4.0. Two obligations follow and both are load-bearing:
-- attribution to Speedtest(R) by Ookla(R), which the UI renders on every view of these
-- figures, and NonCommercial use. Pahad Pulse is a free public portal with no advertising,
-- paid tier or resale, which is why this is here at all -- if that ever changes, this source
-- is the first thing that has to be revisited, and `may_redistribute` is the switch.
--
-- HOW THE DISTRICT FIGURES WERE COMPUTED.
--
-- Ookla's Q2 2026 tiles (~610 m each) were cut to a box around Uttarakhand, then assigned to
-- districts with ST_Covers against the OpenStreetMap district polygons already in `areas`.
-- 10,589 tiles fell inside the state and EVERY ONE matched exactly one district -- verified,
-- because a tile counted in two districts would inflate both.
--
-- Averages are weighted by `tests`, not by tile. Ookla's per-tile figure is already a mean
-- over that tile's tests, so an unweighted average would let a tile with one test outvote a
-- tile with four hundred. The weighted form is the same arithmetic as averaging the
-- underlying tests directly.
--
-- ONE QUARTER FOR NOW.
--
-- The schema is keyed by quarter and the table takes a series; only Q2 2026 is loaded. Each
-- additional quarter is another ~500 MB download, so backfill is a deliberate act rather
-- than something done on the way past.

INSERT INTO sources
  (source_key, owner_module, department_en, department_hi, url, attribution, licence,
   access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
VALUES
  ('ookla-open-data', 'connectivity',
   'Speedtest by Ookla',
   'स्पीडटेस्ट बाय ऊकला',
   'https://registry.opendata.aws/speedtest-global-performance/',
   'Speedtest(R) by Ookla(R) Global Fixed and Mobile Network Performance Maps, based on analysis by Ookla of Speedtest Intelligence data for Q2 2026. Provided by Ookla and used under CC BY-NC-SA 4.0.',
   'CC BY-NC-SA 4.0 -- attribution required, ShareAlike, and NonCommercial use only.',
   'bulk', 'quarterly', TRUE, 'verified',
   'Quarterly open dataset of Speedtest results aggregated to ~610 m tiles, published to a public S3 bucket with no key. District figures are computed here by joining those tiles to our OpenStreetMap district polygons and averaging weighted by test count. These are measurements of what people experienced where they chose to run a test -- not a coverage map, and not an operator''s advertised speed. Speed is never served without the sample size behind it. NonCommercial: this is a free public portal; a commercial use of the site would require revisiting this source.',
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

INSERT INTO network_performance
  (area_id, kind, quarter_start, download_kbps, upload_kbps, latency_ms,
   tiles, tests, devices, source_id, fetched_at)
VALUES
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'almora'), 'fixed',
   DATE '2026-04-01', 60056, 62647, 20, 204, 1361, 502,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'almora'), 'mobile',
   DATE '2026-04-01', 86621, 11524, 41, 391, 1565, 666,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'bageshwar'), 'fixed',
   DATE '2026-04-01', 42698, 39016, 26, 65, 443, 102,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'bageshwar'), 'mobile',
   DATE '2026-04-01', 118390, 17275, 39, 100, 404, 155,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'chamoli'), 'fixed',
   DATE '2026-04-01', 44028, 38400, 27, 84, 465, 158,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'chamoli'), 'mobile',
   DATE '2026-04-01', 139524, 14761, 39, 232, 925, 417,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'champawat'), 'fixed',
   DATE '2026-04-01', 55235, 61292, 15, 85, 486, 151,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'champawat'), 'mobile',
   DATE '2026-04-01', 125180, 15409, 39, 138, 474, 246,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'dehradun'), 'fixed',
   DATE '2026-04-01', 71226, 70178, 17, 1294, 17700, 6229,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'dehradun'), 'mobile',
   DATE '2026-04-01', 179416, 20291, 35, 1384, 12421, 5059,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'haridwar'), 'fixed',
   DATE '2026-04-01', 60964, 60146, 17, 510, 5723, 1884,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'haridwar'), 'mobile',
   DATE '2026-04-01', 158486, 19623, 34, 878, 6719, 2829,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'nainital'), 'fixed',
   DATE '2026-04-01', 60542, 58790, 24, 674, 5863, 2236,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'nainital'), 'mobile',
   DATE '2026-04-01', 159092, 18112, 33, 814, 4583, 2176,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'pauri-garhwal'), 'fixed',
   DATE '2026-04-01', 62413, 60032, 20, 179, 1225, 434,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'pauri-garhwal'), 'mobile',
   DATE '2026-04-01', 96253, 12723, 35, 432, 2094, 805,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'pithoragarh'), 'fixed',
   DATE '2026-04-01', 33974, 33153, 64, 126, 1733, 311,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'pithoragarh'), 'mobile',
   DATE '2026-04-01', 81851, 14472, 38, 298, 1704, 638,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'rudraprayag'), 'fixed',
   DATE '2026-04-01', 34795, 30940, 27, 53, 261, 99,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'rudraprayag'), 'mobile',
   DATE '2026-04-01', 129463, 12120, 54, 180, 648, 356,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'tehri-garhwal'), 'fixed',
   DATE '2026-04-01', 49642, 43307, 26, 198, 1931, 761,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'tehri-garhwal'), 'mobile',
   DATE '2026-04-01', 110173, 13641, 42, 430, 2062, 871,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'udham-singh-nagar'), 'fixed',
   DATE '2026-04-01', 73563, 73588, 18, 554, 4497, 1311,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'udham-singh-nagar'), 'mobile',
   DATE '2026-04-01', 155588, 19718, 29, 1056, 5358, 2149,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'uttarkashi'), 'fixed',
   DATE '2026-04-01', 34916, 33331, 37, 63, 457, 124,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc')),
  ((SELECT id FROM areas WHERE type = 'district' AND slug = 'uttarkashi'), 'mobile',
   DATE '2026-04-01', 131222, 16539, 94, 167, 644, 290,
   (SELECT id FROM sources WHERE source_key = 'ookla-open-data'), (now() AT TIME ZONE 'utc'))
ON CONFLICT (area_id, kind, quarter_start) DO UPDATE SET
  download_kbps = EXCLUDED.download_kbps,
  upload_kbps   = EXCLUDED.upload_kbps,
  latency_ms    = EXCLUDED.latency_ms,
  tiles         = EXCLUDED.tiles,
  tests         = EXCLUDED.tests,
  devices       = EXCLUDED.devices,
  source_id     = EXCLUDED.source_id,
  fetched_at    = EXCLUDED.fetched_at;

-- ROLLBACK
-- DELETE FROM network_performance;
-- DELETE FROM sources WHERE source_key = 'ookla-open-data';
