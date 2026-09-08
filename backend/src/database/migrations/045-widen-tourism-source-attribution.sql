-- 045 — the tourism source now carries arrivals as well as accommodation, so say so.
--
-- 040 registered `uk-tourism-capacity` when the only thing read from it was the district
-- accommodation table, and worded the attribution accordingly. 044 added the Char Dham and
-- Hemkund arrival figures against the same source, which left every arrivals row on the
-- tourism page citing "accommodation figures" underneath a table of pilgrim counts.
--
-- Forward-only, so this is a new file rather than an edit to 040: 040 has already run, and
-- changing an applied migration would leave this database and a fresh one disagreeing.

UPDATE sources
   SET attribution =
         'Uttarakhand Tourism Department, reproduced in the Rural Development and Migration Commission second interim report, February 2023',
       metadata_note =
         'District-wise accommodation capacity, and Char Dham and Hemkund Sahib pilgrim arrivals for 2019-2021, transcribed from the commission''s February 2023 report. Both were checked against the totals the report states for itself: accommodation sums to 7,622 units and 188,999 beds, arrivals to 3,477,957 for 2019. The 2020 and 2021 arrival figures are pandemic years, when the yatra was suspended and then capped, and fell roughly tenfold; they are stored as published rather than smoothed.'
 WHERE source_key = 'uk-tourism-capacity';

-- ROLLBACK
-- No rollback: this only corrects descriptive text on an existing row.
