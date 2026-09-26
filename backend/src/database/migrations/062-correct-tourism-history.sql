-- 062 — Replace estimated pilgrimage figures with the Tourism Department's published totals.
--
-- Migration 052 introduced rounded internet estimates and future-year projections. A public
-- data product must not present either as observations. This forward migration preserves the
-- audit trail, removes the 2026 projections, and attaches each published vintage to the exact
-- Uttarakhand Tourism Development Board report from which it was transcribed.

INSERT INTO sources
  (source_key, owner_module, department_en, department_hi, url, attribution, licence,
   access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
VALUES
  ('uk-tourism-statistics-2018-2020', 'tourism',
   'Uttarakhand Tourism Development Board', 'उत्तराखण्ड पर्यटन विकास परिषद',
   'https://uttarakhandtourism.gov.in/assets/pdf/TouristStatistics2000_2020.pdf',
   'Uttarakhand Tourism Development Board, Tourist Statistics 2000-2020',
   'Government publication; reproduced with attribution.', 'manual', 'annual', TRUE,
   'verified', 'Destination totals transcribed from the official UTDB statistical report.', TRUE),
  ('uk-tourism-statistics-2021-2023', 'tourism',
   'Uttarakhand Tourism Development Board', 'उत्तराखण्ड पर्यटन विकास परिषद',
   'https://uttarakhandtourism.gov.in/sites/default/files/document/type/Statistic21-23.pdf',
   'Uttarakhand Tourism Development Board, Tourist Statistics 2021-2023',
   'Government publication; reproduced with attribution.', 'manual', 'annual', TRUE,
   'verified', 'Destination totals transcribed from the official UTDB statistical report.', TRUE),
  ('uk-tourism-statistics-2024', 'tourism',
   'Uttarakhand Tourism Development Board', 'उत्तराखण्ड पर्यटन विकास परिषद',
   'https://uttarakhandtourism.gov.in/assets/media/UTDB_media_1743665047Yearly_Report_Statistics_2024.pdf',
   'Uttarakhand Tourism Development Board, Yearly Tourist Statistics 2024',
   'Government publication; reproduced with attribution.', 'manual', 'annual', TRUE,
   'verified', 'Destination totals transcribed from the official UTDB yearly report.', TRUE),
  ('uk-tourism-statistics-2025', 'tourism',
   'Uttarakhand Tourism Development Board', 'उत्तराखण्ड पर्यटन विकास परिषद',
   'https://uttarakhandtourism.gov.in/assets/media/UTDB_media_1785820386Uttarakhand_Tourist_Footfall-2025.pdf',
   'Uttarakhand Tourism Development Board, Tourist Footfall 2025',
   'Government publication; reproduced with attribution.', 'manual', 'annual', TRUE,
   'verified', 'Destination totals transcribed from the official UTDB yearly report.', TRUE)
ON CONFLICT (source_key) DO UPDATE SET
  owner_module = EXCLUDED.owner_module, department_en = EXCLUDED.department_en,
  department_hi = EXCLUDED.department_hi, url = EXCLUDED.url,
  attribution = EXCLUDED.attribution, licence = EXCLUDED.licence,
  access_method = EXCLUDED.access_method, cadence = EXCLUDED.cadence,
  may_redistribute = EXCLUDED.may_redistribute, metadata_status = EXCLUDED.metadata_status,
  metadata_note = EXCLUDED.metadata_note, is_enabled = EXCLUDED.is_enabled;

-- Projections are not observations and must not appear in a historical arrivals endpoint.
DELETE FROM destination_annual_visitors v
USING destinations d
WHERE v.destination_id = d.id
  AND v.year = 2026
  AND d.slug IN ('kedarnath', 'badrinath', 'gangotri', 'yamunotri', 'hemkund-sahib');

WITH published(slug, year, visitors, source_key) AS (
  VALUES
    ('kedarnath', 2019::smallint, 1000021, 'uk-tourism-statistics-2018-2020'),
    ('badrinath', 2019::smallint, 1244993, 'uk-tourism-statistics-2018-2020'),
    ('gangotri', 2019::smallint, 530334, 'uk-tourism-statistics-2018-2020'),
    ('yamunotri', 2019::smallint, 465534, 'uk-tourism-statistics-2018-2020'),
    ('hemkund-sahib', 2019::smallint, 239910, 'uk-tourism-statistics-2018-2020'),
    ('kedarnath', 2020::smallint, 135349, 'uk-tourism-statistics-2018-2020'),
    ('badrinath', 2020::smallint, 155055, 'uk-tourism-statistics-2018-2020'),
    ('gangotri', 2020::smallint, 23774, 'uk-tourism-statistics-2018-2020'),
    ('yamunotri', 2020::smallint, 7728, 'uk-tourism-statistics-2018-2020'),
    ('hemkund-sahib', 2020::smallint, 8290, 'uk-tourism-statistics-2018-2020'),
    ('kedarnath', 2021::smallint, 243012, 'uk-tourism-statistics-2021-2023'),
    ('badrinath', 2021::smallint, 199409, 'uk-tourism-statistics-2021-2023'),
    ('gangotri', 2021::smallint, 33771, 'uk-tourism-statistics-2021-2023'),
    ('yamunotri', 2021::smallint, 33311, 'uk-tourism-statistics-2021-2023'),
    ('hemkund-sahib', 2021::smallint, 19909, 'uk-tourism-statistics-2021-2023'),
    ('kedarnath', 2022::smallint, 1564248, 'uk-tourism-statistics-2021-2023'),
    ('badrinath', 2022::smallint, 1763578, 'uk-tourism-statistics-2021-2023'),
    ('gangotri', 2022::smallint, 781961, 'uk-tourism-statistics-2021-2023'),
    ('yamunotri', 2022::smallint, 621538, 'uk-tourism-statistics-2021-2023'),
    ('hemkund-sahib', 2022::smallint, 190284, 'uk-tourism-statistics-2021-2023'),
    ('kedarnath', 2023::smallint, 1958863, 'uk-tourism-statistics-2021-2023'),
    ('badrinath', 2023::smallint, 1780429, 'uk-tourism-statistics-2021-2023'),
    ('gangotri', 2023::smallint, 712749, 'uk-tourism-statistics-2021-2023'),
    ('yamunotri', 2023::smallint, 560918, 'uk-tourism-statistics-2021-2023'),
    ('hemkund-sahib', 2023::smallint, 164546, 'uk-tourism-statistics-2021-2023'),
    ('kedarnath', 2024::smallint, 1653581, 'uk-tourism-statistics-2024'),
    ('badrinath', 2024::smallint, 1774264, 'uk-tourism-statistics-2024'),
    ('gangotri', 2024::smallint, 540190, 'uk-tourism-statistics-2024'),
    ('yamunotri', 2024::smallint, 515067, 'uk-tourism-statistics-2024'),
    ('hemkund-sahib', 2024::smallint, 185972, 'uk-tourism-statistics-2024'),
    ('kedarnath', 2025::smallint, 1770274, 'uk-tourism-statistics-2025'),
    ('badrinath', 2025::smallint, 1778298, 'uk-tourism-statistics-2025'),
    ('gangotri', 2025::smallint, 758249, 'uk-tourism-statistics-2025'),
    ('yamunotri', 2025::smallint, 644637, 'uk-tourism-statistics-2025'),
    ('hemkund-sahib', 2025::smallint, 187974, 'uk-tourism-statistics-2025')
)
INSERT INTO destination_annual_visitors (destination_id, year, visitors, source_id, fetched_at)
SELECT d.id, p.year, p.visitors, s.id, (now() AT TIME ZONE 'utc')
FROM published p
JOIN destinations d ON d.slug = p.slug
JOIN sources s ON s.source_key = p.source_key
ON CONFLICT (destination_id, year) DO UPDATE SET
  visitors = EXCLUDED.visitors,
  source_id = EXCLUDED.source_id,
  fetched_at = EXCLUDED.fetched_at;
