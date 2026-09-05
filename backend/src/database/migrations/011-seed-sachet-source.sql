-- 011 — SACHET (NDMA), the national CAP alert aggregator, as an alerts source.
--
-- WHY A SECOND ALERT SOURCE, when `imd-cap-alerts` already exists and works:
--
--   1. It is filtered to Uttarakhand at source. SACHET publishes a per-state feed
--      (rss_uttarakhand.xml). The IMD feed we already ingest is national and unfiltered —
--      verified 2026-09-04: 99 items, none concerning Uttarakhand, so the connector
--      correctly wrote 0 rows. On the same day the SACHET state feed carried 10 live
--      Uttarakhand warnings from IMD Dehradun.
--
--   2. It carries real geometry. Every SACHET alert exposes a polygon endpoint returning
--      lat/lon rings. IMD's CAP documents publish an empty <cap:area> with only a text
--      description, which is why that connector has to guess districts by name matching.
--
--   3. It aggregates beyond IMD. CWC (river and flood warnings) and the state SDMAs publish
--      through the same feed — on 2026-09-04, CWC was the single largest publisher
--      nationally. That is hydromet-shaped data arriving through the alerts module.
--
-- `may_redistribute = TRUE` — and this is the one judgement call in this migration, so it is
-- recorded rather than assumed. The feed declares <copyright>public domain</copyright> in its
-- own channel metadata, which is a positive statement of terms by the publisher, not an
-- absence of one. That is materially different from IMD, which states nothing and therefore
-- stays FALSE (DS-6, datasets.md §9). `metadata_status` remains 'provisional' because it has
-- still not been confirmed in writing with NDMA — the flag reflects published terms, and the
-- status field is what records that nobody has countersigned them.

INSERT INTO sources
  (source_key, owner_module, department_en, department_hi, url, attribution, licence,
   access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
VALUES
  (
    'sachet-ndma',
    'alerts',
    'National Disaster Management Authority (SACHET)',
    'राष्ट्रीय आपदा प्रबंधन प्राधिकरण (सचेत)',
    'https://sachet.ndma.gov.in',
    'Source: SACHET, National Disaster Management Authority, Government of India',
    'Public domain (declared in the feed)',
    'feed',
    'realtime',
    TRUE,
    'provisional',
    'Per-state CAP feed with polygon geometry, no key and no IP whitelist. Endpoints verified reachable 2026-09-04. The feed channel declares <copyright>public domain</copyright>, which is why may_redistribute is TRUE where IMD is FALSE. Still to be confirmed in writing with NDMA before public launch.',
    TRUE
  )
AS new
ON DUPLICATE KEY UPDATE
  owner_module     = new.owner_module,
  department_en    = new.department_en,
  department_hi    = new.department_hi,
  url              = new.url,
  attribution      = new.attribution,
  licence          = new.licence,
  access_method    = new.access_method,
  cadence          = new.cadence,
  may_redistribute = new.may_redistribute,
  metadata_status  = new.metadata_status,
  metadata_note    = new.metadata_note,
  is_enabled       = new.is_enabled;

-- The alerts layer now has a connector and real geometry behind it, so it stops advertising
-- itself as unavailable (migration 003's rule: an unbuilt layer shows as disabled). It is
-- also switched on by default — an active weather warning is the single most important thing
-- the map can tell someone, and hiding it behind a toggle inverts that.
UPDATE map_layers
   SET is_available = TRUE, is_default_visible = TRUE
 WHERE layer_key = 'alerts';

-- ROLLBACK
-- UPDATE map_layers SET is_available = FALSE, is_default_visible = FALSE WHERE layer_key = 'alerts';
-- DELETE FROM sources WHERE source_key = 'sachet-ndma';
