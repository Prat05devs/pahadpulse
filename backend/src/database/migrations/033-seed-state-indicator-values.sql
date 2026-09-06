-- 025 — the state profile figures, with a source and a vintage on every one.
--
-- These six numbers were displayed on the dashboard as hardcoded literals in
-- `web/src/features/dashboard/services/index.ts`. They rendered beside Census figures that
-- DO carry provenance and looked exactly as authoritative. Two of them were wrong.
--
-- WHAT WAS WRONG, AND HOW IT WAS CHECKED:
--
--   villages       displayed 16,817 — matches no published Census total. The Census 2011
--                  figure is 16,793, which reconciles as 15,745 inhabited + 1,048
--                  uninhabited. A second breakdown in circulation gives 16,826 (15,761 +
--                  1,065). Both of those are self-consistent; 16,817 is neither, and is
--                  16 short of one and 33 short of the other. Seeded at 16,793 with the
--                  variant recorded below, because a figure that reconciles to its own
--                  published components is the one worth trusting.
--
--   forest cover   displayed 63% — matches neither of FSI's two measures. Forest COVER
--                  (what satellites see) is 45.44%. RECORDED FOREST AREA (what is legally
--                  notified) is around 71%. 63% sits between them and corresponds to
--                  nothing published. Seeded at 45.44%, the ISFR 2019 figure, which
--                  VERIFIES: 24,303.04 sq km / 53,483 sq km = 45.441%, so the percentage
--                  and the area agree with each other and with the state area seeded below.
--                  That internal check is the reason this number is trusted.
--
-- WHAT WAS ALREADY RIGHT: population (10,086,292), area (53,483 sq km) and literacy
-- (78.82%) are the published Census 2011 figures and are seeded unchanged. Literacy is the
-- 7-plus rate, which is what "literacy rate" means in Census output — some secondary sites
-- print 68.22%, which is literates as a share of TOTAL population including under-sevens
-- and is a different measure, not a correction to this one.
--
-- Vintage is the Census reference date (2011-03-01) or the assessment year, never the date
-- these were loaded (DS-2).

-- Census 2011 state totals.
INSERT INTO indicator_values (indicator_key, area_id, vintage, value, source_id, fetched_at)
SELECT v.indicator_key, a.id, v.vintage, v.value, s.id, (now() AT TIME ZONE 'utc')
  FROM (
    SELECT 'state_population'    AS indicator_key, DATE '2011-03-01' AS vintage, 10086292 AS value
    UNION ALL
    SELECT 'state_area_sq_km'    AS indicator_key, DATE '2011-03-01' AS vintage, 53483 AS value
    UNION ALL
    SELECT 'state_literacy_rate' AS indicator_key, DATE '2011-03-01' AS vintage, 78.82 AS value
    UNION ALL
    SELECT 'state_villages'      AS indicator_key, DATE '2011-03-01' AS vintage, 16793 AS value
  ) AS v
  JOIN areas a   ON a.type = 'state' AND a.code = 'UK'
  JOIN sources s ON s.source_key = 'census-2011'
ON CONFLICT (indicator_key, area_id, vintage) DO UPDATE SET
  value      = EXCLUDED.value,
  source_id  = EXCLUDED.source_id,
  fetched_at = (now() AT TIME ZONE 'utc');

-- Forest cover, ISFR 2019. Vintage is the assessment year, not the publication date.
INSERT INTO indicator_values (indicator_key, area_id, vintage, value, source_id, fetched_at)
SELECT 'state_forest_cover_pct', a.id, DATE '2019-01-01', 45.44, s.id, (now() AT TIME ZONE 'utc')
  FROM areas a
  JOIN sources s ON s.source_key = 'forest-survey-india'
 WHERE a.type = 'state' AND a.code = 'UK'
ON CONFLICT (indicator_key, area_id, vintage) DO UPDATE SET
  value      = EXCLUDED.value,
  source_id  = EXCLUDED.source_id,
  fetched_at = (now() AT TIME ZONE 'utc');

-- ROLLBACK
-- DELETE FROM indicator_values WHERE indicator_key IN (
--   'state_population', 'state_area_sq_km', 'state_literacy_rate',
--   'state_villages', 'state_forest_cover_pct');
