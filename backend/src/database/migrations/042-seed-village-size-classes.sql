-- 042 — how small Uttarakhand's villages are, from Census 2011.
--
-- WHY THIS BELONGS BESIDE THE MIGRATION FIGURES.
--
-- Half the state's inhabited villages hold fewer than 200 people. That is the structural
-- fact the migration surveys sit on top of: a settlement of 150 loses its school when thirty
-- people leave, and the commission's "emptied since 2011" counts are drawn almost entirely
-- from this size class. Without it a reader sees that Pauri Garhwal lost more people than
-- Haridwar and cannot tell that 73% of Pauri's villages were under 200 to begin with while
-- 11% of Haridwar's were.
--
-- NOT THE SAME NUMBER AS `state_villages`, AND DELIBERATELY SO.
--
-- `state_villages` is 16,793 — every village Census 2011 lists. `inhabited_villages` sums to
-- 15,745, the villages with anyone living in them. The difference is roughly a thousand
-- villages already uninhabited at the 2011 count. Both are Census 2011 and both are right;
-- they measure different things, and the labels say which so the pair cannot read as an
-- error.
--
-- SOURCE ATTRIBUTION.
--
-- These are Census of India 2011 figures, so they carry the existing `census-2011` source
-- rather than a new one. The commission's February 2023 report is where they were read from,
-- but the commission is reproducing the Census, not publishing a finding — and attributing
-- the Census to the commission would misstate who counted.
--
-- VERIFICATION. Two independent checks, both exact: every district row sums to its own
-- stated village total, and every size-class column sums to the state totals the table
-- prints (15,745 / 7,823 / 4,684 / 1,826 / 824 / 471 / 96 / 21).

INSERT INTO indicators (indicator_key, category, scope, label_en, label_hi, unit, decimals, higher_is_better)
VALUES
  ('inhabited_villages', 'demography', 'district',
   'Inhabited Villages', 'आबाद गाँव', 'count', 0, NULL),
  ('villages_under_200', 'demography', 'district',
   'Villages Under 200 People', '200 से कम आबादी वाले गाँव', 'count', 0, NULL),
  -- Derived, from the two counts above at the same vintage and source. The report performs
  -- exactly this division for the state (49.7%), so the district figure is the same statistic
  -- at a finer grain rather than a new claim. Direction is NULL on purpose: a district with
  -- many small villages is mountainous, not failing.
  ('share_villages_under_200', 'demography', 'district',
   'Share of Villages Under 200 People', '200 से कम आबादी वाले गाँवों का अनुपात', 'percent', 1, NULL)
ON CONFLICT (indicator_key) DO UPDATE SET
  category         = EXCLUDED.category,
  scope            = EXCLUDED.scope,
  label_en         = EXCLUDED.label_en,
  label_hi         = EXCLUDED.label_hi,
  unit             = EXCLUDED.unit,
  decimals         = EXCLUDED.decimals,
  higher_is_better = EXCLUDED.higher_is_better;

INSERT INTO indicator_values (indicator_key, area_id, vintage, value, source_id, fetched_at)
VALUES
  ('inhabited_villages', (SELECT id FROM areas WHERE type = 'district' AND slug = 'almora'), DATE '2011-03-01', 2184, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'almora'), DATE '2011-03-01', 1177, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('share_villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'almora'), DATE '2011-03-01', 53.9, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('inhabited_villages', (SELECT id FROM areas WHERE type = 'district' AND slug = 'bageshwar'), DATE '2011-03-01', 874, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'bageshwar'), DATE '2011-03-01', 469, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('share_villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'bageshwar'), DATE '2011-03-01', 53.7, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('inhabited_villages', (SELECT id FROM areas WHERE type = 'district' AND slug = 'chamoli'), DATE '2011-03-01', 1170, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'chamoli'), DATE '2011-03-01', 591, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('share_villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'chamoli'), DATE '2011-03-01', 50.5, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('inhabited_villages', (SELECT id FROM areas WHERE type = 'district' AND slug = 'champawat'), DATE '2011-03-01', 662, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'champawat'), DATE '2011-03-01', 344, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('share_villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'champawat'), DATE '2011-03-01', 52.0, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('inhabited_villages', (SELECT id FROM areas WHERE type = 'district' AND slug = 'dehradun'), DATE '2011-03-01', 731, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'dehradun'), DATE '2011-03-01', 208, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('share_villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'dehradun'), DATE '2011-03-01', 28.5, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('inhabited_villages', (SELECT id FROM areas WHERE type = 'district' AND slug = 'haridwar'), DATE '2011-03-01', 518, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'haridwar'), DATE '2011-03-01', 56, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('share_villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'haridwar'), DATE '2011-03-01', 10.8, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('inhabited_villages', (SELECT id FROM areas WHERE type = 'district' AND slug = 'nainital'), DATE '2011-03-01', 1097, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'nainital'), DATE '2011-03-01', 384, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('share_villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'nainital'), DATE '2011-03-01', 35.0, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('inhabited_villages', (SELECT id FROM areas WHERE type = 'district' AND slug = 'pauri-garhwal'), DATE '2011-03-01', 3142, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'pauri-garhwal'), DATE '2011-03-01', 2303, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('share_villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'pauri-garhwal'), DATE '2011-03-01', 73.3, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('inhabited_villages', (SELECT id FROM areas WHERE type = 'district' AND slug = 'pithoragarh'), DATE '2011-03-01', 1572, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'pithoragarh'), DATE '2011-03-01', 949, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('share_villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'pithoragarh'), DATE '2011-03-01', 60.4, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('inhabited_villages', (SELECT id FROM areas WHERE type = 'district' AND slug = 'rudraprayag'), DATE '2011-03-01', 653, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'rudraprayag'), DATE '2011-03-01', 270, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('share_villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'rudraprayag'), DATE '2011-03-01', 41.3, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('inhabited_villages', (SELECT id FROM areas WHERE type = 'district' AND slug = 'tehri-garhwal'), DATE '2011-03-01', 1774, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'tehri-garhwal'), DATE '2011-03-01', 812, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('share_villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'tehri-garhwal'), DATE '2011-03-01', 45.8, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('inhabited_villages', (SELECT id FROM areas WHERE type = 'district' AND slug = 'udham-singh-nagar'), DATE '2011-03-01', 674, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'udham-singh-nagar'), DATE '2011-03-01', 74, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('share_villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'udham-singh-nagar'), DATE '2011-03-01', 11.0, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('inhabited_villages', (SELECT id FROM areas WHERE type = 'district' AND slug = 'uttarkashi'), DATE '2011-03-01', 694, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'uttarkashi'), DATE '2011-03-01', 186, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc')),
  ('share_villages_under_200', (SELECT id FROM areas WHERE type = 'district' AND slug = 'uttarkashi'), DATE '2011-03-01', 26.8, (SELECT id FROM sources WHERE source_key = 'census-2011'), (now() AT TIME ZONE 'utc'))
ON CONFLICT (indicator_key, area_id, vintage) DO UPDATE SET
  value      = EXCLUDED.value,
  source_id  = EXCLUDED.source_id,
  fetched_at = EXCLUDED.fetched_at;

-- ROLLBACK
-- DELETE FROM indicator_values WHERE indicator_key IN
--   ('inhabited_villages', 'villages_under_200', 'share_villages_under_200');
-- DELETE FROM indicators WHERE indicator_key IN
--   ('inhabited_villages', 'villages_under_200', 'share_villages_under_200');
