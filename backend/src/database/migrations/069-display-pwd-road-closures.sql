-- 069 — Display PWD Uttarakhand road closures.
--
-- Migration 064 collected the MISPWD road closure dashboard every 10 minutes but served none
-- of it, because PWD's website policy allows reproduction only "after taking proper permission
-- by sending a mail to us". That permission now exists: reproduction permission from PWD
-- Uttarakhand, with the approval of Uttarakhand's Transport Minister, as confirmed by the
-- product owner on 2026-10-29. The written permission is kept by the product owner, not in
-- this repository.
--
-- The conditions of the policy still apply and are already met on every surface: the source is
-- named and linked (`attribution`, `url`), statuses are shown as reported to PWD, and the
-- "Informed By" column (officials' names and IDs) is never read or stored.
--
-- Only `may_redistribute` and the note change. The history collected since 064 becomes
-- visible at once, so the page shows current closures and recent reopenings immediately.

UPDATE sources
SET may_redistribute = TRUE,
    metadata_note = REPLACE(
      metadata_note,
      'Collected but not displayed until PWD grants reproduction permission.',
      'Displayed with reproduction permission from PWD Uttarakhand, approved by the Transport Minister of Uttarakhand (confirmed 2026-10-29).'
    )
WHERE source_key = 'pwd-uk-road-closures';
