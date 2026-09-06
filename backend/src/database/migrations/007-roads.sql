-- 007 — the highway network: which National and State Highways run through the state.
--
-- Geometry is deliberately absent. The highway lines are already in the basemap's vector
-- tiles, so the map picks them out by `ref` rather than us re-serving thousands of ways.
-- This table records that a route EXISTS and roughly where, so the UI can list and frame it.

CREATE TABLE road_routes (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref           VARCHAR(16) NOT NULL UNIQUE,
  network       road_network NOT NULL,
  route_number  VARCHAR(8) NOT NULL,
  segment_count INTEGER NOT NULL DEFAULT 0 CHECK (segment_count >= 0),

  -- Extent, for framing the map on a selected route. Nullable: a route whose ways could
  -- not be assembled still exists and still belongs in the list.
  bounds        geometry(Polygon, 4326),

  source_id     INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  vintage       DATE NOT NULL,
  fetched_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  created_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX idx_road_route_network ON road_routes (network, route_number);

CREATE TRIGGER road_routes_updated_at BEFORE UPDATE ON road_routes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ROLLBACK
-- DROP TABLE IF EXISTS road_routes;
