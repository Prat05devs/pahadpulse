-- 022 — GDACS, the Global Disaster Alert and Coordination System.
--
-- Run jointly by the European Commission's Joint Research Centre and the UN. It scores
-- disaster EVENTS — flood, earthquake, tropical cyclone — with a severity level and a
-- GLIDE number that cross-references international disaster databases.
--
-- WHY THIS SITS ALONGSIDE SACHET RATHER THAN REPLACING IT:
--
-- SACHET carries Indian meteorological warnings issued by IMD/NDMA — the authority for
-- Uttarakhand. GDACS carries independently assessed disaster events with an international
-- impact score. They answer different questions ("has an authority issued a warning" vs
-- "is a scored disaster under way"), and the same flood can legitimately appear in both.
--
-- When it does, it stays two rows. The alerts upsert key is (source_id, source_alert_id),
-- so each source's view is preserved with its own provenance and neither overwrites the
-- other (ALR-1). Merging them would mean this platform deciding which body is right about
-- an event, which is exactly the judgement ALR-6 forbids it from making.
--
-- `may_redistribute` is TRUE: the GDACS RSS declares `<copyright>public domain</copyright>`
-- in the feed itself. `metadata_status` stays 'provisional' all the same — the copyright
-- line is the feed's own assertion, and confirming scope with JRC is a conversation nobody
-- has had yet. Provisional here means "displayable, not yet confirmed with the publisher",
-- which is a different state from IMD's "not displayable at all".

INSERT INTO sources
  (source_key, owner_module, department_en, department_hi, url, attribution, licence,
   access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
VALUES
  (
    'gdacs',
    'alerts',
    'Global Disaster Alert and Coordination System (JRC / UN)',
    'वैश्विक आपदा चेतावनी और समन्वय प्रणाली',
    'https://www.gdacs.org',
    'Source: GDACS — European Commission Joint Research Centre and the United Nations',
    'Public domain (as declared by the GDACS feed)',
    'api',
    'realtime',
    TRUE,
    'provisional',
    -- No semicolons inside this literal — see the note in migration 020.
    'The GDACS RSS declares public domain in its own copyright element. Scope not yet confirmed with JRC. Events are filtered to the Uttarakhand bounding box before ingestion, because GDACS reports globally and the rest is out of this product scope.',
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

-- ROLLBACK
-- DELETE FROM sources WHERE source_key = 'gdacs';
