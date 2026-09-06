-- 021 — one weather station per district, placed at the district headquarters.
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
-- mechanism by which this stays honest, which is why the name comes from `headquarters_en`
-- and not from the district.
--
-- Coordinates come from `areas.centroid_lat/lng`, which migration 002 documents as being
-- the headquarters coordinates. Selected from `areas` rather than retyped so that a
-- correction there propagates here instead of silently diverging.
--
-- Elevation is not stored: Open-Meteo resolves it from the coordinate and reports the
-- elevation it actually modelled, which is the number that matters and would go stale here.

SET @open_meteo_id = (SELECT id FROM sources WHERE source_key = 'open-meteo');

INSERT INTO stations
  (source_id, source_station_code, type, name_en, name_hi, area_id, lat, lng, river_name, is_active)
SELECT
  new.source_id, new.source_station_code, new.type, new.name_en, new.name_hi,
  new.area_id, new.lat, new.lng, new.river_name, new.is_active
FROM (
  SELECT
    @open_meteo_id                        AS source_id,
    CONCAT('open-meteo:', a.slug)         AS source_station_code,
    'weather'                             AS type,
    -- The headquarters town, not the district. See the header note.
    COALESCE(a.headquarters_en, a.name_en) AS name_en,
    COALESCE(a.headquarters_hi, a.name_hi) AS name_hi,
    a.id                                  AS area_id,
    a.centroid_lat                        AS lat,
    a.centroid_lng                        AS lng,
    NULL                                  AS river_name,
    TRUE                                  AS is_active
  FROM areas a
  WHERE a.type = 'district'
    -- A district with no representative point cannot be fetched by coordinate. Skipped
    -- rather than defaulted: a fabricated coordinate would produce a plausible temperature
    -- for the wrong place, which is worse than no panel at all.
    AND a.centroid_lat IS NOT NULL
    AND a.centroid_lng IS NOT NULL
) AS new
ON DUPLICATE KEY UPDATE
  type       = new.type,
  name_en    = new.name_en,
  name_hi    = new.name_hi,
  area_id    = new.area_id,
  lat        = new.lat,
  lng        = new.lng,
  is_active  = new.is_active;

-- ROLLBACK
-- DELETE FROM stations WHERE source_id = (SELECT id FROM sources WHERE source_key = 'open-meteo');
