-- 066 — Drop the tables of three retired features, and the two sources that fed only them.
--
-- WHAT IS RETIRED (product owner's decision, 2026-09-26), after an audit found each unused by
-- both the web app and the mobile app:
--
--   * Development projects — `GET /api/projects` and the theme-score comparison
--     (`GET /api/indicators/comparison`) that read them. No page ever showed either.
--     Tables: development_projects, development_project_areas (migrations 036/037).
--     Source: pahad-pulse-project-register (3 hand-curated rows).
--
--   * Map layer catalogue — `GET /api/map/layers`. The maps build their own layers.
--     Table: map_layers (migration 002).
--
--   * Out-migration surveys — the /migration page was retired earlier; its API went with it
--     and these tables were left behind with nothing reading them.
--     Tables: migration_surveys, migration_categories, migration_observations,
--     migration_district_figures (migrations 038/039).
--     Source: uk-migration-commission (its only rows were the two surveys).
--
-- RECOVERABLE. The migrations that created and filled every table remain in git; restoring a
-- feature means re-running those files' SQL, not re-transcribing anything.
--
-- No CASCADE: children are dropped before parents, so an unexpected dependency fails this
-- migration loudly instead of silently dropping something else.

DROP TABLE development_project_areas;
DROP TABLE development_projects;
DROP TABLE map_layers;
DROP TABLE migration_observations;
DROP TABLE migration_district_figures;
DROP TABLE migration_categories;
DROP TABLE migration_surveys;

-- The run log may reference a source; neither of these was ever ingested, but a stray row
-- must not block the delete.
DELETE FROM ingestion_runs
 WHERE source_id IN (SELECT id FROM sources
                      WHERE source_key IN ('pahad-pulse-project-register', 'uk-migration-commission'));
DELETE FROM sources
 WHERE source_key IN ('pahad-pulse-project-register', 'uk-migration-commission');

-- ROLLBACK
-- Re-run the CREATE and INSERT statements of migrations 002 (map_layers), 036/037 (projects),
-- 038 and 039 (migration surveys) and the source seeds they reference.
