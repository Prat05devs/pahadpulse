-- 010 — the geometry an alert affects, so it can be drawn on the terrain map.
--
-- Why this is a column on `alerts` rather than a table of its own: an alert has at most one
-- affected-area geometry, it arrives in the same upstream document as the rest of the alert,
-- and it dies with the alert. A 1:1 table would buy nothing and cost a join on the hottest
-- read path on the site.
--
-- All three columns are NULLABLE and must stay that way. The IMD CAP feed publishes an empty
-- <cap:area> with only a text description — that is the majority of what we ingest today, and
-- an alert with no geometry is still a valid alert that must render in the list. Geometry is
-- an enrichment, never a requirement (ALR-3's "degrade, never fail" applied to the map).

ALTER TABLE alerts
  -- GeoJSON Polygon or MultiPolygon, in [longitude, latitude] order. NULL when the upstream
  -- states the affected area only in prose.
  ADD COLUMN geometry     JSON            NULL AFTER web_url,
  -- The alert's map anchor. Derived from `geometry` when the source states no centroid of
  -- its own, so a geometry-less alert can still be pinned when the source gives a point.
  ADD COLUMN centroid_lat DECIMAL(9,6)    NULL AFTER geometry,
  ADD COLUMN centroid_lng DECIMAL(9,6)    NULL AFTER centroid_lat;

-- The map endpoint asks only for active alerts that can actually be drawn. Without this it
-- is a full scan of the alerts table on every map load.
CREATE INDEX idx_alert_mappable ON alerts (status, expires_at, centroid_lat);

-- ROLLBACK
-- DROP INDEX idx_alert_mappable ON alerts;
-- ALTER TABLE alerts DROP COLUMN centroid_lng, DROP COLUMN centroid_lat, DROP COLUMN geometry;
