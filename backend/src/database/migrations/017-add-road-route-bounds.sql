-- 017 — the geographic extent of each highway, so the map can frame one route.
--
-- A bounding box rather than the route geometry, deliberately. Framing a highway needs only
-- its extent, and the line itself is already in the basemap's vector tiles — storing ~3,000
-- way geometries to redraw what the client has would be a large cost for no visible gain.
--
-- NULLABLE: a route whose ways carry no bounds cannot be framed, and the UI falls back to
-- the whole-state view rather than jumping somewhere wrong. An absent box is a known
-- limitation, not a reason to reject the highway from the list.

ALTER TABLE road_routes
  ADD COLUMN min_lat DECIMAL(9,6) NULL AFTER segment_count,
  ADD COLUMN min_lng DECIMAL(9,6) NULL AFTER min_lat,
  ADD COLUMN max_lat DECIMAL(9,6) NULL AFTER min_lng,
  ADD COLUMN max_lng DECIMAL(9,6) NULL AFTER max_lat;

-- ROLLBACK
-- ALTER TABLE road_routes
--   DROP COLUMN max_lng, DROP COLUMN max_lat, DROP COLUMN min_lng, DROP COLUMN min_lat;
