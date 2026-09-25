-- Department budgets, from the state's own Budget at a Glance.
--
-- WHY THIS SOURCE. The governance workspace has to answer "which department got how much",
-- and nothing in this database held an allocation. The Budget Directorate publishes the
-- demand-wise table in `Budget at a Glance`, laid before the Legislative Assembly — the
-- primary document, not a summary of it by a newspaper or a think tank.
--
-- HOW IT WAS CHECKED. The 31 demands below sum to 1,117,032,109 thousand, which is
-- Rs 1,11,703 crore — the total outlay the same document states for itself. A transcription
-- that misses or double-counts a demand cannot produce that number, which is the only reason
-- to trust a table pulled out of a PDF.
--
-- UNITS. Thousands of rupees, as published. Converting at import would bake a rounding into
-- the stored figure; the API and the UI convert for display, where it can be seen.

INSERT INTO sources (
  source_key, owner_module, department_en, department_hi, url, attribution, licence,
  access_method, cadence, may_redistribute, metadata_status, metadata_note
) VALUES (
  'uk-budget-directorate',
  'governance',
  'Budget Directorate, Finance Department, Government of Uttarakhand',
  'बजट निदेशालय, वित्त विभाग, उत्तराखण्ड सरकार',
  'https://budget.uk.gov.in/budget-2026-27/',
  'Source: Budget at a Glance 2026-27, Budget Directorate, Government of Uttarakhand',
  'Reproduction requires prior permission by email, accurate context and prominent source acknowledgement',
  'manual',
  'annual',
  FALSE,
  'provisional',
  'Demand-wise allocations transcribed from Budget at a Glance 2026-27 (as laid before the Legislative Assembly). The 31 demands sum to the total outlay the document states for itself, Rs 1,11,703 crore. Figures are budget estimates, not expenditure: what was allocated, never what was spent. Revised estimates and actuals are published later and are not held here. The source remains non-redistributable until prior reproduction permission is obtained and recorded.'
) ON CONFLICT (source_key) DO UPDATE SET
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
  metadata_note    = EXCLUDED.metadata_note;

CREATE TABLE department_budgets (
  id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  source_id        INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,

  -- The state's own numbering of the demands for grants. Stable across years, and what a
  -- reader cross-checking against the PDF will look for.
  demand_no        SMALLINT NOT NULL CHECK (demand_no > 0),
  -- `2026-27`, as the document writes it.
  fiscal_year      VARCHAR(9) NOT NULL CHECK (fiscal_year ~ '^[0-9]{4}-[0-9]{2}$'),

  name_en          VARCHAR(255) NOT NULL,

  /*
   * Voted and charged, kept apart because they are different things: charged expenditure is
   * not put to a vote of the Assembly. Summing them into one number would quietly erase that.
   */
  revenue_voted    BIGINT NOT NULL DEFAULT 0 CHECK (revenue_voted >= 0),
  revenue_charged  BIGINT NOT NULL DEFAULT 0 CHECK (revenue_charged >= 0),
  capital_voted    BIGINT NOT NULL DEFAULT 0 CHECK (capital_voted >= 0),
  capital_charged  BIGINT NOT NULL DEFAULT 0 CHECK (capital_charged >= 0),
  -- The PDF prints a total as well as the four components. A mismatch is a transcription
  -- failure, so the migration fails instead of persisting a row whose two readings disagree.
  total            BIGINT NOT NULL CHECK (
    total >= 0 AND total = revenue_voted + revenue_charged + capital_voted + capital_charged
  ),

  created_at       TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  UNIQUE (fiscal_year, demand_no)
);

CREATE INDEX idx_department_budgets_year ON department_budgets (fiscal_year, total DESC);

INSERT INTO department_budgets (
  source_id, fiscal_year, demand_no, name_en,
  revenue_voted, revenue_charged, capital_voted, capital_charged, total
)
SELECT s.id, '2026-27', d.demand_no, d.name_en,
       d.revenue_voted, d.revenue_charged, d.capital_voted, d.capital_charged, d.total
  FROM sources s,
       (VALUES
  (1, 'Legislative Assembly', 1147896, 57851, 225002, 0, 1430749),
  (2, 'Governor', 0, 189466, 0, 0, 189466),
  (3, 'Council of Ministers', 709201, 0, 1000000, 0, 1709201),
  (4, 'Judicial Administration', 3935661, 928458, 895900, 0, 5760019),
  (5, 'Election', 2233116, 0, 5001, 0, 2238117),
  (6, 'Revenue and General Administration', 21557723, 17545, 5753800, 0, 27329068),
  (7, 'Finance, Taxes, Planning, Secretariat and Miscellaneous Services', 178364542, 83844011, 25245704, 281606257, 569060514),
  (8, 'Excise', 530660, 0, 20000, 0, 550660),
  (9, 'Public Service Commission', 264150, 618900, 81400, 0, 964450),
  (10, 'Police and Jail', 32091882, 0, 3155076, 0, 35246958),
  (11, 'Education, Sports, Youth Welfare and Culture', 118719103, 0, 7886919, 0, 126606022),
  (12, 'Medical and Family Welfare', 42525020, 0, 2939649, 0, 45464669),
  (13, 'Water Supply, Housing and Urban Development', 10953942, 0, 31479526, 0, 42433468),
  (14, 'Information', 5426823, 0, 70000, 0, 5496823),
  (15, 'Welfare Schemes', 27442002, 0, 1682996, 0, 29124998),
  (16, 'Labour and Employment', 4521329, 0, 1348004, 0, 5869333),
  (17, 'Agriculture and Research', 11134110, 0, 3824083, 0, 14958193),
  (18, 'Co-operative', 1192283, 0, 133156, 0, 1325439),
  (19, 'Rural Development', 22538821, 0, 16063349, 0, 38602170),
  (20, 'Irrigation and Flood', 6242319, 0, 9672510, 0, 15914829),
  (21, 'Energy', 1390760, 0, 18376446, 0, 19767206),
  (22, 'Public Works', 11246661, 570994, 24559100, 80000, 36456755),
  (23, 'Industries', 4981816, 0, 860001, 0, 5841817),
  (24, 'Transport', 2845912, 0, 1350557, 0, 4196469),
  (25, 'Food', 3367887, 0, 13120000, 0, 16487887),
  (26, 'Tourism', 2105950, 0, 2934500, 0, 5040450),
  (27, 'Forest', 10232043, 0, 1266800, 0, 11498843),
  (28, 'Animal Husbandry', 8155140, 0, 1087001, 0, 9242141),
  (29, 'Horticulture Development', 5292102, 36753, 740001, 0, 6068856),
  (30, 'Welfare of Scheduled Castes', 17687764, 0, 7001084, 0, 24688848),
  (31, 'Welfare of Scheduled Tribes', 4793852, 0, 2673839, 0, 7467691)
       ) AS d(demand_no, name_en, revenue_voted, revenue_charged, capital_voted, capital_charged, total)
 WHERE s.source_key = 'uk-budget-directorate';

-- ROLLBACK
-- DROP TABLE IF EXISTS department_budgets;
-- DELETE FROM sources WHERE source_key = 'uk-budget-directorate';
