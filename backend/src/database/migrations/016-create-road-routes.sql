-- 016 — the highway registry: which National and State Highways run through Uttarakhand.
--
-- This is the `roads` module's first real table. It deliberately stores the ROUTES, not their
-- geometry: the map already draws highway lines from the basemap's own vector tiles, so
-- duplicating ~3,000 way geometries here would cost a lot of storage to render something the
-- client already has. What the platform could not answer before is the plain question "which
-- highways are these?", and that is what this table holds.
--
-- It is explicitly NOT a closure table. Road closures and landslide blocks are manually
-- reported by officials (roads.md) and have no feed; they will land in their own table with
-- their own provenance. A highway existing says nothing about whether it is open today, and
-- no surface may imply otherwise.

CREATE TABLE IF NOT EXISTS road_routes (
  id            INT AUTO_INCREMENT PRIMARY KEY,

  -- Canonical, normalised reference: 'NH34', 'SH12'. OSM spells these several ways
  -- ('NH 34', 'SH-12'); normalisation happens in the connector so the key here is stable.
  ref           VARCHAR(16)  NOT NULL,
  network       ENUM('NH','SH') NOT NULL,
  -- The bare number with any suffix ('34', '107A'). Stored rather than derived so ordering
  -- can be numeric without re-parsing the ref on every query.
  route_number  VARCHAR(8)   NOT NULL,

  -- How many distinct OSM ways carry this ref inside the state. A rough proxy for how much
  -- of the highway lies in Uttarakhand — useful for ordering, never presented as a length.
  segment_count INT UNSIGNED NOT NULL DEFAULT 0,

  -- Provenance (DS-1). OSM is continuously edited and states no vintage of its own, so
  -- `vintage` is the date of the extract — the date the data DESCRIBES, which for a live
  -- database is the day it was read.
  source_id     INT      NOT NULL,
  vintage       DATE     NOT NULL,
  fetched_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_road_routes_source
    FOREIGN KEY (source_id) REFERENCES sources(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  -- Upsert key (DS-5): re-running the connector updates in place, never accumulates.
  UNIQUE KEY uq_road_route_ref (ref),
  KEY idx_road_route_network (network, route_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- The roads connector is a SEPARATE source key from the geography one, because a source key
-- has exactly one owning module (DS-7). `openstreetmap` belongs to geography for boundaries;
-- this row belongs to roads for the highway network.
INSERT INTO sources
  (source_key, owner_module, department_en, department_hi, url, attribution, licence,
   access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
VALUES
  (
    'openstreetmap-roads',
    'roads',
    'OpenStreetMap contributors',
    'ओपनस्ट्रीटमैप योगदानकर्ता',
    'https://www.openstreetmap.org',
    'Map data (c) OpenStreetMap contributors, ODbL',
    'Open Database License (ODbL) 1.0',
    'bulk',
    'monthly',
    TRUE,
    'provisional',
    'National and State Highway references tagged on road ways within Uttarakhand, read via Overpass. Crowd-sourced: the highway list reflects what mappers have tagged, not an NHAI or PWD register, and every surface must attribute it to OpenStreetMap rather than to a government roads authority.',
    TRUE
  )
AS new
ON DUPLICATE KEY UPDATE
  owner_module     = new.owner_module,
  attribution      = new.attribution,
  licence          = new.licence,
  access_method    = new.access_method,
  cadence          = new.cadence,
  may_redistribute = new.may_redistribute,
  metadata_note    = new.metadata_note,
  is_enabled       = new.is_enabled;

-- The roads map layer now has data behind it, so it stops advertising itself as unavailable.
UPDATE map_layers SET is_available = TRUE WHERE layer_key = 'roads';

-- ROLLBACK
-- UPDATE map_layers SET is_available = FALSE WHERE layer_key = 'roads';
-- DROP TABLE IF EXISTS road_routes;
-- DELETE FROM sources WHERE source_key = 'openstreetmap-roads';
