-- 034 — one weather station per district, placed at the district headquarters.
--
-- Reference data, not a dev seed: the ingestion connector reads this table to decide what
-- to fetch, so every environment needs the same 13 rows.
--
-- WHY HEADQUARTERS, AND WHY THAT IS THE HONEST CHOICE:
--
-- A district is not a place with a temperature. Uttarkashi spans Gangotri at 3,000 m and
-- valley floors below 1,000 m, and a single number for "the weather in Uttarkashi" is a
-- fiction whichever point you pick. Two options were available: a polygon centroid, which
-- lands on an arbitrary uninhabited ridge, or the district headquarters, which is a real
-- town where people actually are.
--
-- Headquarters wins because the reading is then TRUE ABOUT SOMEWHERE. The station carries
-- the town's name — 'Gopeshwar', not 'Chamoli' — so the panel says "Gopeshwar, 21°C" and
-- never implies the figure covers 8,000 km² of mountain. Naming the place is the whole
-- mechanism by which this stays honest.
--
-- The location is copied from `areas.centroid`, which migration 010 documents as the
-- headquarters coordinates, rather than retyped — a correction there propagates here
-- instead of silently diverging.

INSERT INTO stations
  (source_id, source_station_code, type, name_en, name_hi, area_id, location, river_name, is_active)
SELECT
  s.id,
  'open-meteo:' || a.slug,
  'weather',
  -- The headquarters town, not the district. See the header note.
  COALESCE(a.headquarters_en, a.name_en),
  COALESCE(a.headquarters_hi, a.name_hi),
  a.id,
  a.centroid,
  NULL,
  TRUE
FROM areas a
CROSS JOIN sources s
WHERE a.type = 'district'
  AND s.source_key = 'open-meteo'
  -- A district with no representative point cannot be fetched by coordinate. Skipped rather
  -- than defaulted: a fabricated coordinate produces a plausible temperature for the wrong
  -- place, which is worse than no panel at all.
  AND a.centroid IS NOT NULL
ON CONFLICT (source_id, source_station_code) DO UPDATE SET
  type      = EXCLUDED.type,
  name_en   = EXCLUDED.name_en,
  name_hi   = EXCLUDED.name_hi,
  area_id   = EXCLUDED.area_id,
  location  = EXCLUDED.location,
  is_active = EXCLUDED.is_active;

-- ROLLBACK
-- DELETE FROM stations WHERE source_id = (SELECT id FROM sources WHERE source_key = 'open-meteo');
