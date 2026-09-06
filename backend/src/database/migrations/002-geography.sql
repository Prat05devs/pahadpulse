-- 002 — geography: the area hierarchy, boundaries, and the map layer registry.
--
-- Every domain row in Pahad Pulse attaches to an area id from this table.
-- See project/modules/geography.md.
--
-- Identifier strategy (geography.md §9): `code` is OUR stable internal identifier and is
-- the join key. `lgd_code` and `census_2011_code` are nullable and reserved for official
-- identifiers, which are not yet confirmed. When they arrive they are backfilled, not
-- swapped in — `code` and `slug` never change, because district URLs are the product's
-- most-shared links.

CREATE TABLE areas (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type              area_type NOT NULL,
  code              VARCHAR(32) NOT NULL,
  slug              VARCHAR(128) NOT NULL,
  name_en           VARCHAR(128) NOT NULL,
  -- Nullable: village names ingested from OSM carry no Devanagari spelling, and inventing
  -- a transliteration would be fabricating a name.
  name_hi           VARCHAR(128),
  parent_id         INTEGER REFERENCES areas(id) ON DELETE RESTRICT,

  -- District-only metadata. NULL for other area types.
  division          division,
  headquarters_en   VARCHAR(128),
  headquarters_hi   VARCHAR(128),

  /*
   * Representative point, as PostGIS geography rather than a lat/lng pair.
   *
   * SRID 4326 is WGS 84 — the coordinate system every source here publishes in, from OSM
   * to SACHET to USGS. `geography` rather than `geometry` so distance and containment are
   * computed on the spheroid: at Uttarakhand's latitude a planar approximation is wrong by
   * enough to matter when deciding which tehsil a village falls in.
   *
   * Not a computed polygon centroid — for districts it is the headquarters town.
   */
  centroid          geography(Point, 4326),

  -- Reserved for official identifiers; backfilled when confirmed.
  lgd_code          VARCHAR(32),
  census_2011_code  VARCHAR(32),

  created_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  CONSTRAINT uq_area_type_code UNIQUE (type, code),
  CONSTRAINT uq_area_slug UNIQUE (slug)
);

CREATE INDEX idx_area_parent ON areas (parent_id, type, id);
CREATE INDEX idx_area_type_id ON areas (type, id);
CREATE INDEX idx_area_lgd ON areas (lgd_code);
CREATE INDEX idx_area_census ON areas (census_2011_code);
CREATE INDEX idx_area_centroid ON areas USING GIST (centroid);

CREATE TRIGGER areas_updated_at BEFORE UPDATE ON areas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

/*
 * Boundaries, in their own table because geometry is large and is almost never wanted
 * alongside the area row. A list query must never drag it along.
 *
 * `geom` is a real PostGIS MultiPolygon, not JSON. That is the substantive change in this
 * migration: placing a village inside a tehsil was a TypeScript ray cast over parsed JSON,
 * and is now `ST_Covers` against a GIST index. `simplified_geom` is what the map is served
 * (GEO-5: the map never receives full precision), pre-simplified at ingestion because the
 * map is its only consumer.
 */
CREATE TABLE area_boundaries (
  area_id           INTEGER PRIMARY KEY REFERENCES areas(id) ON DELETE CASCADE,

  geom              geometry(MultiPolygon, 4326) NOT NULL,
  simplified_geom   geometry(MultiPolygon, 4326),

  -- TRUE while this is generated placeholder geometry rather than official boundary data.
  -- The API surfaces this so no consumer can mistake a placeholder for a survey boundary.
  is_placeholder    BOOLEAN NOT NULL DEFAULT TRUE,

  source_note       VARCHAR(255) NOT NULL,

  created_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX idx_boundary_placeholder ON area_boundaries (is_placeholder);
-- The index that replaces the hand-rolled bounding-box pre-filter.
CREATE INDEX idx_boundary_geom ON area_boundaries USING GIST (geom);

CREATE TRIGGER area_boundaries_updated_at BEFORE UPDATE ON area_boundaries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- The registry of what the map can draw. The DATA for each layer comes from the owning
-- module; this table only declares that the layer exists and how it is ordered.
CREATE TABLE map_layers (
  id                 INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  layer_key          VARCHAR(64) NOT NULL UNIQUE,
  owner_module       VARCHAR(64) NOT NULL,
  name_en            VARCHAR(128) NOT NULL,
  name_hi            VARCHAR(128) NOT NULL,
  display_order      INTEGER NOT NULL,
  is_default_visible BOOLEAN NOT NULL DEFAULT FALSE,
  is_available       BOOLEAN NOT NULL DEFAULT FALSE,

  created_at         TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at         TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX idx_layer_order ON map_layers (display_order, id);

CREATE TRIGGER map_layers_updated_at BEFORE UPDATE ON map_layers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ROLLBACK
-- DROP TABLE IF EXISTS map_layers, area_boundaries, areas;
