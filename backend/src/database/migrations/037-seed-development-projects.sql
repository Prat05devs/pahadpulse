-- 037 — the development project register, and its first verified entries.
--
-- A MANUAL SOURCE, DECLARED AS SUCH.
--
-- There is no feed for "what is being built in Uttarakhand". India Investment Grid (DPIIT /
-- Invest India) publishes projects with district and investment value but exposes no
-- documented public API, and the rest is spread across PIB releases, NHAI pages and state
-- portals. So this register is curated by hand and says so: `access_method` is `manual`,
-- exactly as the reservoir figures transcribed from PDFs are (HYD-7).
--
-- Every row carries the page that supports it. The publisher named here is Pahad Pulse
-- because Pahad Pulse assembled the register -- the AUTHORITY for each claim is the
-- `evidence_url` on the row, which is why that column is NOT NULL.

INSERT INTO sources
  (source_key, owner_module, department_en, department_hi, url, attribution, licence,
   access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
VALUES
  (
    'pahad-pulse-project-register',
    'projects',
    'Pahad Pulse project register',
    'पहाड़ पल्स परियोजना रजिस्टर',
    'https://www.pahadpulse.live',
    'Compiled by Pahad Pulse from the government source cited on each project',
    'Compilation by Pahad Pulse. Each entry links the primary source it is drawn from.',
    'manual',
    'monthly',
    TRUE,
    'provisional',
    'Hand-curated because no feed exists for infrastructure projects at district level. Every row records the exact page supporting it and the date a human last checked that page still says so. The per-row confidence column carries how well-attested each entry is, and must be shown rather than averaged away -- a widely reported film city with no government source naming its district is not the same claim as an expressway confirmed by NHAI and PIB, and must not look like it.',
    TRUE
  )
ON CONFLICT (source_key) DO UPDATE SET
  owner_module     = EXCLUDED.owner_module,
  department_en    = EXCLUDED.department_en,
  department_hi    = EXCLUDED.department_hi,
  url              = EXCLUDED.url,
  attribution      = EXCLUDED.attribution,
  licence          = EXCLUDED.licence,
  access_method    = EXCLUDED.access_method,
  cadence          = EXCLUDED.cadence,
  may_redistribute = EXCLUDED.may_redistribute,
  metadata_status  = EXCLUDED.metadata_status,
  metadata_note    = EXCLUDED.metadata_note,
  is_enabled       = EXCLUDED.is_enabled;

-- The first entries. Researched and confirmed on 2026-09-07.
--
-- Deliberately NOT included: the Uttarakhand Film City. It is widely reported and plainly
-- real as an intention, but no government page was found that names the district it will be
-- built in, and a project register whose defining column is the district cannot carry a row
-- whose district is a guess. It goes in when a primary source names the site.

INSERT INTO development_projects
  (slug, name_en, name_hi, sector, status, confidence, summary_en,
   capital_cost_cr, announced_on, expected_on, completed_on,
   source_id, evidence_url, verified_on)
SELECT
  v.slug, v.name_en, v.name_hi, v.sector::project_sector, v.status::project_status,
  v.confidence::project_confidence, v.summary_en, v.capital_cost_cr,
  v.announced_on::date, v.expected_on::date, v.completed_on::date,
  s.id, v.evidence_url, DATE '2026-09-07'
FROM (
  VALUES
    (
      'delhi-dehradun-expressway',
      'Delhi-Dehradun Expressway',
      'दिल्ली-देहरादून एक्सप्रेसवे',
      'connectivity', 'operational', 'official',
      'A 210 km access-controlled corridor from Delhi to Dehradun via Baghpat, Baraut, Shamli and Saharanpur, cutting the road journey from roughly six hours to about two and a half. It connects onward to Haridwar and Roorkee and meets the Eastern Peripheral and Delhi-Mumbai expressways.',
      11868.60, NULL, NULL, '2026-04-14',
      'https://www.newsonair.gov.in/delhi-dehradun-economic-corridor-to-cut-travel-time-boost-regional-connectivity-nhai/'
    ),
    (
      'nit-uttarakhand-permanent-campus',
      'NIT Uttarakhand permanent campus, Sumari',
      'एनआईटी उत्तराखंड स्थायी परिसर, सुमाड़ी',
      'education', 'under_construction', 'official',
      'The permanent campus of the National Institute of Technology Uttarakhand at Sumari in Pauri Garhwal. Phase one covers about 60 acres of a 203-acre site with capacity for 1,260 students. The institute currently runs from a temporary campus at Government ITI Srinagar.',
      NULL, NULL, '2027-10-01', NULL,
      'https://indiainvestmentgrid.gov.in/opportunities/nip-project/611963'
    ),
    (
      'science-city-dehradun',
      'Science City, Dehradun',
      'साइंस सिटी, देहरादून',
      'education', 'under_construction', 'reported',
      'India''s fifth Science City, being developed alongside the Regional Science Centre in Dehradun. Planned exhibits cover astronomy and space, robotics, climate change and biotechnology, with a space theatre, an outdoor science park and a Himalayan biodiversity panorama.',
      NULL, NULL, NULL, NULL,
      'https://rscdoon.com/science-city-dehradun-project/'
    )
) AS v(slug, name_en, name_hi, sector, status, confidence, summary_en, capital_cost_cr,
       announced_on, expected_on, completed_on, evidence_url)
CROSS JOIN (SELECT id FROM sources WHERE source_key = 'pahad-pulse-project-register') s
ON CONFLICT (slug) DO NOTHING;

-- Districts. The expressway is entered against Dehradun as its terminus and Haridwar as a
-- district it serves, because attributing a shared corridor to one district understates the
-- other -- which is precisely the comparison error this feature exists to avoid.
INSERT INTO development_project_areas (project_id, area_id, is_primary)
SELECT p.id, a.id, m.is_primary
FROM (
  VALUES
    ('delhi-dehradun-expressway',        'dehradun',      TRUE),
    ('delhi-dehradun-expressway',        'haridwar',      FALSE),
    ('nit-uttarakhand-permanent-campus', 'pauri-garhwal', TRUE),
    ('science-city-dehradun',            'dehradun',      TRUE)
) AS m(project_slug, area_slug, is_primary)
JOIN development_projects p ON p.slug = m.project_slug
JOIN areas a ON a.slug = m.area_slug
ON CONFLICT (project_id, area_id) DO NOTHING;

-- ROLLBACK
-- DELETE FROM development_projects WHERE slug IN ('delhi-dehradun-expressway', 'nit-uttarakhand-permanent-campus', 'science-city-dehradun');
-- DELETE FROM sources WHERE source_key = 'pahad-pulse-project-register';
