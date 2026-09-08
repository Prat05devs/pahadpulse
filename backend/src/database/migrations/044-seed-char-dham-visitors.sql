-- 044 — the five Char Dham and Hemkund shrines, and their 2019-2021 arrivals.
--
-- VERIFICATION. The five shrines sum to 3,477,957 for 2019, 330,039 for 2020 and 529,382 for
-- 2021 — exactly the yearly totals the report prints beneath the table.
--
-- THE PANDEMIC YEARS ARE STORED AS PUBLISHED.
--
-- 2020 and 2021 are roughly a tenth of 2019 because the yatra was suspended and then capped.
-- They are not smoothed, interpolated or annotated away: a tenfold collapse is the true shape
-- of what happened, and a chart that hid it would misrepresent both the pandemic and the
-- recovery. Anything reading these as a trend must show the years, which is why the API
-- returns the year on every row.

INSERT INTO destinations (slug, type, name_en, name_hi, area_id)
VALUES
  ('kedarnath', 'char_dham', 'Kedarnath', 'केदारनाथ',
   (SELECT id FROM areas WHERE type = 'district' AND slug = 'rudraprayag')),
  ('badrinath', 'char_dham', 'Badrinath', 'बद्रीनाथ',
   (SELECT id FROM areas WHERE type = 'district' AND slug = 'chamoli')),
  ('gangotri', 'char_dham', 'Gangotri', 'गंगोत्री',
   (SELECT id FROM areas WHERE type = 'district' AND slug = 'uttarkashi')),
  ('yamunotri', 'char_dham', 'Yamunotri', 'यमुनोत्री',
   (SELECT id FROM areas WHERE type = 'district' AND slug = 'uttarkashi')),
  -- Not one of the four dhams, but counted alongside them by the state in the same table,
  -- so it is carried as `religious` rather than quietly relabelled a fifth dham.
  ('hemkund-sahib', 'religious', 'Hemkund Sahib', 'हेमकुण्ड साहिब',
   (SELECT id FROM areas WHERE type = 'district' AND slug = 'chamoli'))
ON CONFLICT (slug) DO UPDATE SET
  type    = EXCLUDED.type,
  name_en = EXCLUDED.name_en,
  name_hi = EXCLUDED.name_hi,
  area_id = EXCLUDED.area_id;

INSERT INTO destination_annual_visitors (destination_id, year, visitors, source_id, fetched_at)
SELECT d.id, v.year, v.visitors,
       (SELECT id FROM sources WHERE source_key = 'uk-tourism-capacity'),
       (now() AT TIME ZONE 'utc')
  FROM (VALUES
    ('kedarnath',     2019::smallint,  998956),
    ('kedarnath',     2020::smallint,  135287),
    ('kedarnath',     2021::smallint,  242985),
    ('badrinath',     2019::smallint, 1244100),
    ('badrinath',     2020::smallint,  155009),
    ('badrinath',     2021::smallint,  199406),
    ('gangotri',      2019::smallint,  529880),
    ('gangotri',      2020::smallint,   23736),
    ('gangotri',      2021::smallint,   33771),
    ('yamunotri',     2019::smallint,  465111),
    ('yamunotri',     2020::smallint,    7717),
    ('yamunotri',     2021::smallint,   33311),
    ('hemkund-sahib', 2019::smallint,  239910),
    ('hemkund-sahib', 2020::smallint,    8290),
    ('hemkund-sahib', 2021::smallint,   19909)
  ) AS v(slug, year, visitors)
  JOIN destinations d ON d.slug = v.slug
ON CONFLICT (destination_id, year) DO UPDATE SET
  visitors   = EXCLUDED.visitors,
  source_id  = EXCLUDED.source_id,
  fetched_at = EXCLUDED.fetched_at;

-- ROLLBACK
-- DELETE FROM destination_annual_visitors;
-- DELETE FROM destinations;
