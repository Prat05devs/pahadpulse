-- 061 — use the canonical www host for the general OGD Platform reference.
-- The bare host intermittently times out during automated validation while the canonical
-- public host and individual resource pages remain reachable.

UPDATE sources
   SET url = 'https://www.data.gov.in/',
       updated_at = (now() AT TIME ZONE 'utc')
 WHERE source_key = 'data-gov-in';

-- ROLLBACK
-- UPDATE sources SET url = 'https://data.gov.in' WHERE source_key = 'data-gov-in';
