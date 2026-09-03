-- 001 — geography spine: the area hierarchy, boundaries, and the map layer registry.
--
-- Every domain row in Pahad Pulse attaches to an area id from this table.
-- See project/modules/geography.md.
--
-- Identifier strategy (project/modules/geography.md §9):
--   `code` is OUR stable internal identifier and is the join key today.
--   `lgd_code` and `census_2011_code` are nullable and reserved for official identifiers,
--   which are not yet confirmed. When they arrive they are backfilled, not swapped in —
--   `code` and `slug` never change, because district URLs are the product's most-shared links.

CREATE TABLE IF NOT EXISTS areas (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  type              ENUM('state','district','tehsil','village') NOT NULL,
  code              VARCHAR(32) NOT NULL,
  slug              VARCHAR(128) NOT NULL,
  name_en           VARCHAR(128) NOT NULL,
  name_hi           VARCHAR(128) NOT NULL,
  parent_id         INT NULL,

  -- District-only metadata. NULL for other area types.
  division          ENUM('garhwal','kumaon') NULL,
  headquarters_en   VARCHAR(128) NULL,
  headquarters_hi   VARCHAR(128) NULL,

  -- Approximate representative point. Not a computed polygon centroid.
  centroid_lat      DECIMAL(9,6) NULL,
  centroid_lng      DECIMAL(9,6) NULL,

  -- Reserved for official identifiers; backfilled when confirmed.
  lgd_code          VARCHAR(32) NULL,
  census_2011_code  VARCHAR(32) NULL,

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_areas_parent
    FOREIGN KEY (parent_id) REFERENCES areas(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  UNIQUE KEY uq_area_type_code (type, code),
  UNIQUE KEY uq_area_slug (slug),
  KEY idx_area_parent (parent_id, type, id),
  KEY idx_area_type_id (type, id),
  KEY idx_area_lgd (lgd_code),
  KEY idx_area_census (census_2011_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Boundaries live in their own table because GeoJSON is large and is almost never
-- wanted alongside the area row. A list query must never drag geometry with it.
CREATE TABLE IF NOT EXISTS area_boundaries (
  area_id           INT NOT NULL PRIMARY KEY,

  -- RFC 7946 GeoJSON geometry (Polygon or MultiPolygon), coordinates as [lng, lat].
  geojson           JSON NOT NULL,
  simplified_geojson JSON NULL,

  -- TRUE while this is generated placeholder geometry rather than official boundary data.
  -- The API surfaces this so no consumer can mistake a placeholder for a survey boundary.
  is_placeholder    BOOLEAN NOT NULL DEFAULT TRUE,

  -- Free-text provenance until the `datasets` module lands and this becomes source_id FK.
  source_note       VARCHAR(255) NOT NULL,

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_boundaries_area
    FOREIGN KEY (area_id) REFERENCES areas(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  KEY idx_boundary_placeholder (is_placeholder)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- The registry of what the map can draw. The DATA for each layer comes from the owning
-- module; this table only declares that the layer exists and how it is ordered.
CREATE TABLE IF NOT EXISTS map_layers (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  layer_key         VARCHAR(64) NOT NULL,
  owner_module      VARCHAR(64) NOT NULL,
  name_en           VARCHAR(128) NOT NULL,
  name_hi           VARCHAR(128) NOT NULL,
  display_order     INT NOT NULL,
  is_default_visible BOOLEAN NOT NULL DEFAULT FALSE,
  is_available      BOOLEAN NOT NULL DEFAULT FALSE,

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_layer_key (layer_key),
  KEY idx_layer_order (display_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ROLLBACK
-- DROP TABLE IF EXISTS map_layers;
-- DROP TABLE IF EXISTS area_boundaries;
-- DROP TABLE IF EXISTS areas;
