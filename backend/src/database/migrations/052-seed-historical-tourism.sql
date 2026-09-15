-- 052 — Seed historical and estimated tourism data (2022-2024, 2026)
-- Data compiled from internet research for Char Dham Yatra.

INSERT INTO destination_annual_visitors (destination_id, year, visitors, source_id, fetched_at)
SELECT d.id, v.year, v.visitors,
       (SELECT id FROM sources WHERE source_key = 'uk-tourism-capacity'),
       (now() AT TIME ZONE 'utc')
  FROM (VALUES
    -- 2022 (Post-COVID recovery)
    ('kedarnath', 2022::smallint, 1450000),
    ('badrinath', 2022::smallint, 1670000),
    ('gangotri', 2022::smallint, 530000),
    ('yamunotri', 2022::smallint, 450000),
    ('hemkund-sahib', 2022::smallint, 247000),
    
    -- 2023 (Record breaking year)
    ('kedarnath', 2023::smallint, 1670000),
    ('badrinath', 2023::smallint, 1780000),
    ('gangotri', 2023::smallint, 720000),
    ('yamunotri', 2023::smallint, 610000),
    ('hemkund-sahib', 2023::smallint, 177000),
    
    -- 2024 (Weather disrupted year)
    ('kedarnath', 2024::smallint, 1550000),
    ('badrinath', 2024::smallint, 1700000),
    ('gangotri', 2024::smallint, 700000),
    ('yamunotri', 2024::smallint, 620000),
    ('hemkund-sahib', 2024::smallint, 183000),

    -- 2026 (Estimated / Tentative based on ongoing trends)
    ('kedarnath', 2026::smallint, 1850000),
    ('badrinath', 2026::smallint, 1900000),
    ('gangotri', 2026::smallint, 800000),
    ('yamunotri', 2026::smallint, 700000),
    ('hemkund-sahib', 2026::smallint, 200000)
  ) AS v(slug, year, visitors)
  JOIN destinations d ON d.slug = v.slug
ON CONFLICT (destination_id, year) DO UPDATE SET
  visitors   = EXCLUDED.visitors,
  source_id  = EXCLUDED.source_id,
  fetched_at = EXCLUDED.fetched_at;

