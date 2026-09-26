-- 064 — Road closures reported to PWD Uttarakhand, and the source they come from.
--
-- WHY THIS SOURCE. roads.md §9 named the module's blocking unknown: does any Uttarakhand
-- authority publish road closures? PWD does. Its MIS dashboard (mis.pwduk.in/pwd/roadClosure)
-- lists every closure reported by PWD, PMGSY, BRO, NHIDCL and NHAI divisions — road, kilometre
-- markers, time closed, the division's estimated reopening, status and district — updated by
-- field staff through the day. Verified 2026-09-26: 2,328 closures since 1 April, 54 closed.
--
-- IT IS A WEB PAGE, NOT AN API. `access_method` is 'feed' as the nearest of the four allowed
-- values; the note says what it really is. The connector reads the page's HTML table.
--
-- COLLECTED, NOT DISPLAYED. PWD's website policy says its material "may be reproduced free of
-- charge after taking proper permission by sending a mail to us", accurately and with the
-- source prominently acknowledged. Reading the public page is not reproducing it, so — as for
-- IMD alerts (DS-6) — the source is ingested but never served until that permission exists:
--   * `is_enabled = TRUE` — fetched every 10 minutes, so the reader is proven on real data and
--     a history exists on the day permission arrives. (Product owner's decision, 2026-09-26.)
--   * `may_redistribute = FALSE` — the public API serves none of it, and says the data is
--     unavailable rather than reporting zero closures (RD-1).
-- Displaying it after permission is one UPDATE of `may_redistribute`, in a migration that
-- records who granted it and when.
--
-- PERSONAL DATA. The dashboard's "Informed By" column carries officials' names and ID
-- numbers. The parser never reads it, and this table has nowhere to put it.

INSERT INTO sources
  (source_key, owner_module, department_en, department_hi, url, attribution, licence,
   access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
VALUES
  (
    'pwd-uk-road-closures',
    'roads',
    'Public Works Department, Government of Uttarakhand',
    'लोक निर्माण विभाग, उत्तराखण्ड सरकार',
    'https://mis.pwduk.in/pwd/roadClosure',
    'Source: Road Closure Dashboard, PWD Uttarakhand (MISPWD)',
    'Reproduction requires prior permission by email, accurate context and prominent source acknowledgement',
    'feed',
    'realtime',
    FALSE,
    'provisional',
    'Read from the public MISPWD road closure dashboard (an HTML page, not an API) every 10 minutes. Closures are reported by PWD, PMGSY, BRO, NHIDCL and NHAI divisions; statuses are as reported and a road may reopen before the report is updated. The "Informed By" column (officials'' names and IDs) is never read or stored. Collected but not displayed until PWD grants reproduction permission.',
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
  metadata_status  = EXCLUDED.metadata_status,
  metadata_note    = EXCLUDED.metadata_note;
-- `may_redistribute` and `is_enabled` are deliberately NOT updated on conflict: once an
-- operator records permission and switches the source on, re-running this file must not
-- switch it back off.

CREATE TABLE road_closures (
  id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id           INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,

  -- `<PWD road id>:<closure number>`. Stable across fetches; the upsert key (DS-5).
  source_closure_key  VARCHAR(64) NOT NULL,
  pwd_road_id         INTEGER NOT NULL,
  closure_no          VARCHAR(32) NOT NULL,

  road_name           VARCHAR(512) NOT NULL,
  -- Kilometre markers as PWD lists them. A long highway closure can name dozens.
  km_markers          TEXT,
  -- NH, SH, MDR, ODR, VR, LVR … as PWD classifies the road; NULL for PWD's "Unknown".
  road_type           VARCHAR(16),
  department          VARCHAR(64),
  division            VARCHAR(128),

  -- PWD's own district text, kept so a resolution can be audited; `area_id` is ours, and
  -- NULL when the text matched no district (served state-wide, never guessed).
  district_raw        VARCHAR(128),
  area_id             INTEGER REFERENCES areas(id) ON DELETE SET NULL,

  status              VARCHAR(20) NOT NULL
                        CHECK (status IN ('closed', 'partially_closed', 'partially_opened', 'open', 'unknown')),
  -- All UTC. `closed_at` and `expected_open_at` are PWD's; the estimate is the division's,
  -- displayed as theirs and never as a promise (RD-7).
  closed_at           TIMESTAMP NOT NULL,
  expected_open_at    TIMESTAMP,

  -- Ours. `status_changed_at` is when WE first saw the current status — the honest time we
  -- can put on "reopened", since PWD does not publish one. `last_seen_at` is the last run
  -- whose fetch included this closure; a closure missing from a fetch is never flipped to
  -- open (RD-1), it simply stops being confirmed.
  first_seen_at       TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  status_changed_at   TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  last_seen_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  fetched_at          TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  CONSTRAINT uq_road_closure_source_key UNIQUE (source_id, source_closure_key)
);

-- The two public reads: what is closed or recently reopened now, optionally in one district.
CREATE INDEX idx_road_closure_status_seen ON road_closures (status, last_seen_at);
CREATE INDEX idx_road_closure_area ON road_closures (area_id);

-- Same lockdown as every table since 055: RLS on, and no reach for Supabase's API roles.
ALTER TABLE road_closures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE road_closures FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE road_closures FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE road_closures FROM authenticated';
  END IF;
END
$$;

-- ROLLBACK
-- DROP TABLE IF EXISTS road_closures;
-- DELETE FROM sources WHERE source_key = 'pwd-uk-road-closures';
