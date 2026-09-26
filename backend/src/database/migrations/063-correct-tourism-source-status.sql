-- 063 — Correct source-registry status for UTDB reports inserted by migration 062.
--
-- The publisher and report URLs are official, and the figures remain displayable with
-- attribution. The reports do not carry a self-contained open-data licence statement,
-- however, so the registry must not call the reuse metadata fully verified.

UPDATE sources
SET metadata_status = 'provisional',
    metadata_note = CASE
      WHEN metadata_note LIKE '%standalone redistribution licence%'
        THEN metadata_note
      ELSE metadata_note || ' Government publisher verified; standalone redistribution licence text remains to be confirmed.'
    END
WHERE source_key IN (
  'uk-tourism-statistics-2018-2020',
  'uk-tourism-statistics-2021-2023',
  'uk-tourism-statistics-2024',
  'uk-tourism-statistics-2025'
);
