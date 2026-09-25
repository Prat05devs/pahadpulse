-- 060 — replace retired source URLs with their current public landing pages.
--
-- Source records are public navigation, not archival notes: a report may remain historically
-- valid while its old departmental hostname disappears. These destinations were checked on
-- 25 September 2026 and lead to the current publisher or publication catalogue.

UPDATE sources
   SET url = 'https://censusindia.gov.in/census.website/en/data/population-finder',
       updated_at = (now() AT TIME ZONE 'utc')
 WHERE source_key = 'census-2011';

UPDATE sources
   SET url = 'https://des.uk.gov.in/statistical-publications/',
       attribution = 'Source: Uttarakhand Statistical Diary and administrative state profile, Directorate of Economics and Statistics',
       updated_at = (now() AT TIME ZONE 'utc')
 WHERE source_key = 'uk-current-state-profile';

UPDATE sources
   SET url = 'https://ucdfaanchal.com/about-us/',
       updated_at = (now() AT TIME ZONE 'utc')
 WHERE source_key = 'uk-dairy-federation';

UPDATE sources
   SET url = 'https://uttarakhandpalayanayog.com/home.aspx',
       updated_at = (now() AT TIME ZONE 'utc')
 WHERE source_key IN (
   'uk-des-district-reports',
   'uk-district-composite-index',
   'uk-migration-commission'
 );

-- ROLLBACK
-- Source-link repairs are forward-only. Restore a previous URL only after verifying that it
-- has become a maintained public destination again.
