-- 065 — Key PWD road closures by road and closure time, not PWD's "Closure No".
--
-- WHAT WAS WRONG. Migration 064 keyed a closure as `<PWD road id>:<Closure No>`. Verified on
-- the first two production runs (2026-09-26): "Closure No" is not an identifier but a running
-- count of that road's closures WITHIN THE REQUESTED DATE WINDOW — the same closure of road
-- 65, closed 2026-09-25 05:03 UTC, is number 9 in a six-month fetch and number 8 in a
-- July-onwards fetch. Every change of window would have re-inserted the season as new rows.
--
-- THE KEY NOW. `<PWD road id>@<closed at, UTC>` — unique across all 2,328 closures of the
-- season, and stable because both parts are facts about the closure, not about the query.
--
-- WHY THE ROWS ARE DELETED. The table held only the minutes-old output of those two test runs,
-- collected but never displayed (`may_redistribute = FALSE`), with duplicates from the bad
-- key. The next run re-reads the whole season.

DELETE FROM road_closures;
ALTER TABLE road_closures DROP COLUMN closure_no;

-- ROLLBACK
-- ALTER TABLE road_closures ADD COLUMN closure_no VARCHAR(32) NOT NULL DEFAULT '';
