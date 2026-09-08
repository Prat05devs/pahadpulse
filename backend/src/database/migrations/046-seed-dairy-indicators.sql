-- 046 — dairy cooperatives and milk production, by district.
--
-- The rural economy the migration surveys describe runs on farming and livestock: 45% of
-- surveyed households name agriculture, horticulture or animal husbandry as their main
-- income. This is the livestock half of that, per district, and it is the first economic
-- indicator here with complete coverage that is not a Census figure.
--
-- MILK IS STORED AS A DAILY AVERAGE, WHICH IS NOT THE COLUMN THE REPORT PRINTS.
--
-- The source table gives, for each month of 2021-22, the AVERAGE DAILY production in kg, and
-- then totals those twelve monthly averages. That total is dimensionally confused: it is
-- neither a year's production nor a daily rate, and publishing 1,137,992 as "Nainital's milk"
-- would be wrong in units by a factor of about thirty. Stored here is the mean of the twelve
-- — the average daily production across the year — which is what the monthly figures actually
-- measure. This is the only derived value in the file and the division is exact.
--
-- WHY THE WOMEN'S SOCIETIES COLUMN IS NOT A SUBSET.
--
-- Both columns sum exactly to the totals the report prints (2,629 and 1,246), but in five
-- districts — Bageshwar, Tehri Garhwal, Uttarkashi, Chamoli and Rudraprayag — the women's
-- count EXCEEDS the total. So they are two separate registries, not a part and a whole. The
-- labels say "societies" and "women's societies" rather than implying one contains the other,
-- and nothing subtracts them: a "non-women's societies" figure would be negative in five
-- districts, which is how we know the subset reading is wrong.
--
-- VERIFICATION. Every district row of the milk table has its twelve monthly figures summing
-- to the row total the report prints, and the thirteen row totals sum to the state total of
-- 2,415,182. Both society columns sum to their stated totals.


INSERT INTO sources
  (source_key, owner_module, department_en, department_hi, url, attribution, licence,
   access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
VALUES
  ('uk-dairy-federation', 'indicators',
   'Uttarakhand Co-operative Dairy Federation',
   'उत्तराखण्ड सहकारी दुग्ध संघ',
   'https://uttarakhandmilk.com',
   'Uttarakhand Co-operative Dairy Federation figures, reproduced in the Rural Development and Migration Commission second interim report, February 2023',
   'Government of Uttarakhand report, reproduced with attribution.',
   'manual', 'annual', TRUE, 'provisional',
   'District dairy society counts as at March 2022, and average daily milk production for 2021-22, transcribed from the commission''s February 2023 report. Milk is stored as the mean of the twelve monthly daily-averages the report prints, not as its sum of those averages -- that sum is neither an annual total nor a daily rate. The women''s society column is a separate registry, not a subset: it exceeds the all-societies count in five districts.',
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

INSERT INTO indicators (indicator_key, category, scope, label_en, label_hi, unit, decimals, higher_is_better)
VALUES
  ('dairy_societies', 'economy', 'district',
   'Dairy Cooperative Societies', 'दुग्ध समितियाँ', 'count', 0, TRUE),
  ('women_dairy_societies', 'economy', 'district',
   'Women''s Dairy Cooperative Societies', 'महिला दुग्ध समितियाँ', 'count', 0, TRUE),
  ('milk_production_daily_kg', 'economy', 'district',
   'Average Daily Milk Production', 'औसत दैनिक दुग्ध उत्पादन', 'kg_per_day', 0, TRUE)
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
  ('dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'almora'), DATE '2022-03-31', 246, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('women_dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'almora'), DATE '2022-03-31', 95, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('milk_production_daily_kg', (SELECT id FROM areas WHERE type = 'district' AND slug = 'almora'), DATE '2022-03-31', 10705, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'bageshwar'), DATE '2022-03-31', 63, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('women_dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'bageshwar'), DATE '2022-03-31', 95, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('milk_production_daily_kg', (SELECT id FROM areas WHERE type = 'district' AND slug = 'bageshwar'), DATE '2022-03-31', 784, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'chamoli'), DATE '2022-03-31', 74, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('women_dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'chamoli'), DATE '2022-03-31', 106, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('milk_production_daily_kg', (SELECT id FROM areas WHERE type = 'district' AND slug = 'chamoli'), DATE '2022-03-31', 1645, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'champawat'), DATE '2022-03-31', 194, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('women_dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'champawat'), DATE '2022-03-31', 74, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('milk_production_daily_kg', (SELECT id FROM areas WHERE type = 'district' AND slug = 'champawat'), DATE '2022-03-31', 12628, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'dehradun'), DATE '2022-03-31', 286, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('women_dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'dehradun'), DATE '2022-03-31', 95, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('milk_production_daily_kg', (SELECT id FROM areas WHERE type = 'district' AND slug = 'dehradun'), DATE '2022-03-31', 13933, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'haridwar'), DATE '2022-03-31', 254, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('women_dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'haridwar'), DATE '2022-03-31', 90, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('milk_production_daily_kg', (SELECT id FROM areas WHERE type = 'district' AND slug = 'haridwar'), DATE '2022-03-31', 9933, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'nainital'), DATE '2022-03-31', 577, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('women_dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'nainital'), DATE '2022-03-31', 132, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('milk_production_daily_kg', (SELECT id FROM areas WHERE type = 'district' AND slug = 'nainital'), DATE '2022-03-31', 94833, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'pauri-garhwal'), DATE '2022-03-31', 107, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('women_dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'pauri-garhwal'), DATE '2022-03-31', 85, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('milk_production_daily_kg', (SELECT id FROM areas WHERE type = 'district' AND slug = 'pauri-garhwal'), DATE '2022-03-31', 2868, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'pithoragarh'), DATE '2022-03-31', 221, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('women_dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'pithoragarh'), DATE '2022-03-31', 109, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('milk_production_daily_kg', (SELECT id FROM areas WHERE type = 'district' AND slug = 'pithoragarh'), DATE '2022-03-31', 5392, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'rudraprayag'), DATE '2022-03-31', 40, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('women_dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'rudraprayag'), DATE '2022-03-31', 60, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('milk_production_daily_kg', (SELECT id FROM areas WHERE type = 'district' AND slug = 'rudraprayag'), DATE '2022-03-31', 243, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'tehri-garhwal'), DATE '2022-03-31', 58, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('women_dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'tehri-garhwal'), DATE '2022-03-31', 98, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('milk_production_daily_kg', (SELECT id FROM areas WHERE type = 'district' AND slug = 'tehri-garhwal'), DATE '2022-03-31', 786, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'udham-singh-nagar'), DATE '2022-03-31', 454, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('women_dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'udham-singh-nagar'), DATE '2022-03-31', 112, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('milk_production_daily_kg', (SELECT id FROM areas WHERE type = 'district' AND slug = 'udham-singh-nagar'), DATE '2022-03-31', 46648, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'uttarkashi'), DATE '2022-03-31', 55, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('women_dairy_societies', (SELECT id FROM areas WHERE type = 'district' AND slug = 'uttarkashi'), DATE '2022-03-31', 95, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc')),
  ('milk_production_daily_kg', (SELECT id FROM areas WHERE type = 'district' AND slug = 'uttarkashi'), DATE '2022-03-31', 866, (SELECT id FROM sources WHERE source_key = 'uk-dairy-federation'), (now() AT TIME ZONE 'utc'))
ON CONFLICT (indicator_key, area_id, vintage) DO UPDATE SET
  value      = EXCLUDED.value,
  source_id  = EXCLUDED.source_id,
  fetched_at = EXCLUDED.fetched_at;

-- ROLLBACK
-- DELETE FROM indicator_values WHERE indicator_key IN
--   ('dairy_societies', 'women_dairy_societies', 'milk_production_daily_kg');
-- DELETE FROM indicators WHERE indicator_key IN
--   ('dairy_societies', 'women_dairy_societies', 'milk_production_daily_kg');
-- DELETE FROM sources WHERE source_key = 'uk-dairy-federation';
