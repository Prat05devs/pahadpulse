-- 009 — records that the IMD CAP feed endpoint has been verified reachable and its
-- structure confirmed against a real fetch (2026-09-03).
--
-- Forward-only per M1: migration 005 seeded this row before the endpoint was verified and
-- is never edited in place. `may_redistribute` is UNCHANGED and stays FALSE — verifying
-- that the feed is reachable is not the same as confirming redistribution rights (DS-6).
-- That is a legal question for IMD to answer, not something this migration decides.

UPDATE sources
   SET metadata_note = 'Feed endpoint verified reachable and its CAP 1.2 structure confirmed against a real fetch on 2026-09-03 (see src/__tests__/fixtures/imd-cap-*.xml). Ingestion is live. Redistribution rights are still unconfirmed — may_redistribute stays FALSE, so ingested alerts are not publicly displayable until IMD confirms in writing (DS-6). This remains the blocking question for the alerts module — see alerts.md §9.'
 WHERE source_key = 'imd-cap-alerts';

-- ROLLBACK
-- UPDATE sources SET metadata_note = 'Public CAP feed, no key required. Redistribution rights NOT confirmed — may_redistribute stays FALSE, so alerts from this source are ingested but not publicly displayed until IMD confirms. This is the blocking question for the alerts module.' WHERE source_key = 'imd-cap-alerts';
