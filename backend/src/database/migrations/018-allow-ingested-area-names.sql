-- 018 — allow an ingested place name to have no Hindi form.
--
-- The bilingual constraint says curated reference text carries `_en` and `_hi`, both NOT NULL.
-- That is right for the areas a human curated: 1 state, 13 districts, 117 tehsils, all written
-- in both scripts deliberately.
--
-- Villages are different in kind. They arrive by the thousand from OpenStreetMap, which stores
-- a Latin transliteration in `name` and a Devanagari `name:hi` for only a handful — 40 of the
-- 13,887 named places in Uttarakhand when this was written. The two dishonest options were:
--
--   1. Copy the Latin name into `name_hi`. A Hindi reader would then be served "Mudiyani"
--      labelled as Hindi, which is not Hindi — it is the same name in the wrong script.
--   2. Transliterate it ourselves. That is machine translation of place names, which the
--      global constraints forbid outright, and it would invent spellings no map uses.
--
-- So `name_hi` becomes nullable, and a village carries Devanagari only where OSM actually
-- publishes it. A missing Hindi name is then a visible, truthful gap the UI can fall back
-- from, rather than a fabricated value that looks complete.
--
-- Curated rows are unaffected: state, district and tehsil rows all have real Hindi names and
-- the seeds continue to require them.

ALTER TABLE areas MODIFY COLUMN name_hi VARCHAR(128) NULL;

-- ROLLBACK
-- Only reversible while every row has a Hindi name; ingested villages must be removed first.
-- DELETE FROM areas WHERE type = 'village' AND name_hi IS NULL;
-- ALTER TABLE areas MODIFY COLUMN name_hi VARCHAR(128) NOT NULL;
