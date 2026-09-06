-- 020 — Open-Meteo, the first source that supplies weather MEASUREMENTS rather than warnings.
--
-- Why this source exists at all: every alert source on the platform (IMD CAP, SACHET) speaks
-- CAP, and CAP carries warnings — it has no field for temperature, wind or humidity. No
-- amount of work on those connectors produces a "what is it like in Chamoli right now"
-- panel. That needs an observation source, and this is it.
--
-- Why Open-Meteo and not IMD: `may_redistribute`. IMD's terms are unconfirmed, so
-- `imd-cap-alerts` sits at FALSE and its content is ingested but never displayed
-- (migration 009). Open-Meteo publishes under CC-BY 4.0 — redistribution is granted in
-- writing, by name, with attribution. It is the only weather source available today whose
-- values can lawfully reach a reader's screen.
--
-- This is NOT a claim that Open-Meteo outranks IMD as an authority. HYD-5 requires the
-- source chain to be ordered per metric and the source actually used to be shown. When IMD
-- confirms terms it is inserted AHEAD of this row and the panel starts naming IMD instead.
-- Warnings continue to come only from SACHET/IMD — a forecast is never an alert (HYD-4).
--
-- `metadata_status` is 'verified', unusually for a seeded source: CC-BY 4.0 is a published,
-- self-contained licence grant that needs no departmental conversation to confirm. The
-- provisional rows elsewhere are provisional because someone must still ring a department.

INSERT INTO sources
  (source_key, owner_module, department_en, department_hi, url, attribution, licence,
   access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
VALUES
  (
    'open-meteo',
    'hydromet',
    'Open-Meteo',
    'ओपन-मीटियो',
    'https://open-meteo.com',
    'Weather data by Open-Meteo.com (CC BY 4.0)',
    'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    'api',
    'hourly',
    TRUE,
    'verified',
    -- No semicolons inside this literal. The migration runner strips comments and then
    -- splits on ";", so one inside a string truncates the statement (scripts/migrate.ts).
    'CC BY 4.0 grants redistribution with attribution. The attribution string above must appear wherever these values are displayed. No API key and no registration on the free tier. Non-commercial use is under 10,000 calls/day — this product uses about 13 per hourly run, one per district.',
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
-- DELETE FROM sources WHERE source_key = 'open-meteo';
