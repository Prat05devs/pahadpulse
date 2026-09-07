-- 035 — register the OpenStreetMap roads source.
--
-- The `osm-roads` connector has existed and been complete since it was written, but nothing
-- ever seeded a `sources` row for its key. The ingestion runner resolves a connector through
-- that row, so the connector was unreachable: it never appeared in the registry listing, no
-- cron could invoke it, `road_routes` stayed empty, and the roads page rendered "No routes
-- recorded" with both highway counters at zero. The page looked broken when the only thing
-- missing was this row.
--
-- A SECOND registration of the same upstream, not a shared one. `openstreetmap` is owned by
-- `geography` for boundaries, and DS-7 gives a source key exactly one owning module — so the
-- roads use gets its own key rather than borrowing one whose provenance describes boundaries.
--
-- `may_redistribute` is TRUE on the same ODbL basis as the boundary source: attribution plus
-- share-alike, and the roads page already carries the OpenStreetMap attribution string.
-- `metadata_status` stays provisional for the same reason it is provisional there — the
-- share-alike implications for derived data have not been confirmed in writing.

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
    'Which highways run through Uttarakhand, from ways tagged by OSM mappers. This is NOT a road status feed and never states whether a road is open — closures are manually reported and have no upstream feed. Crowd-sourced rather than an NHAI or PWD register, so coverage reflects what mappers have tagged. Monthly cadence because a highway being renumbered is a government act, not a user action.',
    TRUE
  )
ON CONFLICT (source_key) DO UPDATE SET
  owner_module     = EXCLUDED.owner_module,
  department_en    = EXCLUDED.department_en,
  department_hi    = EXCLUDED.department_hi,
  url              = EXCLUDED.url,
  attribution      = EXCLUDED.attribution,
  licence          = EXCLUDED.licence,
  access_method    = EXCLUDED.access_method,
  cadence          = EXCLUDED.cadence,
  may_redistribute = EXCLUDED.may_redistribute,
  metadata_status  = EXCLUDED.metadata_status,
  metadata_note    = EXCLUDED.metadata_note,
  is_enabled       = EXCLUDED.is_enabled;

-- ROLLBACK
-- DELETE FROM sources WHERE source_key = 'openstreetmap-roads';
