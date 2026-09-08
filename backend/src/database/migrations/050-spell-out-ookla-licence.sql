-- 050 — spell out the Ookla licence.
--
-- 049 recorded it as "CC BY-NC-SA 4.0", which is jargon. The sources suite enforces that any
-- source marked `verified` names its licence in words a reader can act on -- an invariant
-- worth keeping, since the licence text is what a downstream user of this API relies on to
-- know what they may do with the figures. Caught by that test, fixed here rather than by
-- loosening it.
--
-- Forward-only: 049 has already run, so this is a new file rather than an edit to it.

UPDATE sources
   SET licence =
         'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0). Attribution to Speedtest by Ookla is required, derivatives must share alike, and commercial use is not permitted.'
 WHERE source_key = 'ookla-open-data';

-- ROLLBACK
-- No rollback: this only corrects descriptive text on an existing row.
