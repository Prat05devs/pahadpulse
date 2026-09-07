-- 036 — development projects: the things being BUILT in a district, as distinct from the
-- statistics describing it.
--
-- WHY A SEPARATE TABLE, AND NOT AN INDICATOR.
--
-- `indicator_values` answers "how much of X does this district have", as a number with a
-- vintage. It cannot express "a 210 km expressway opened here in April 2026 and cut the
-- journey to Delhi to two and a half hours". That is a dated event with a name, a status, a
-- capital value and a source — and it is what people actually mean when they ask which
-- district is moving. A statistic from Census 2011 cannot answer that at all.
--
-- WHY THIS IS NOT SCORED HERE.
--
-- Rows are facts with links. Anything derived from them belongs in the comparison layer,
-- computed from these rows and shown with its inputs, never stored here as an opinion.
--
-- CONFIDENCE IS FIRST-CLASS.
--
-- Statistical sources are institutions; project reporting is often press. `confidence`
-- records how well-attested a row is, and the UI must show it. During research the
-- Delhi-Dehradun Expressway was confirmable against NHAI and PIB, while a widely reported
-- film city had no government source naming its district at all — publishing both at the
-- same visual weight would be the failure this column exists to prevent. A project whose
-- district cannot be established is not entered.

CREATE TYPE project_status AS ENUM (
  'announced',
  'approved',
  'under_construction',
  'operational',
  'stalled',
  'cancelled'
);

CREATE TYPE project_sector AS ENUM (
  'connectivity',
  'education',
  'health',
  'tourism',
  'industry',
  'energy',
  'governance',
  'culture',
  'environment'
);

-- How well-attested the row is. Displayed, never hidden, and never averaged away.
CREATE TYPE project_confidence AS ENUM (
  -- A government body states it: PIB, a ministry, NHAI, the state portal, India Investment Grid.
  'official',
  -- Established outlets report it consistently, but no primary government page was found.
  'reported',
  -- Announced or aspirational, with details (district, value, timeline) still unsettled.
  'indicative'
);

CREATE TABLE development_projects (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  slug              VARCHAR(120) NOT NULL UNIQUE,
  name_en           VARCHAR(200) NOT NULL,
  name_hi           VARCHAR(200),

  sector            project_sector NOT NULL,
  status            project_status NOT NULL,
  confidence        project_confidence NOT NULL,

  -- What it changes, in one sentence, factual and attributable. Not marketing copy.
  summary_en        TEXT NOT NULL,
  summary_hi        TEXT,

  -- Rupees in crore, as Indian government reporting states it. Nullable: many genuine
  -- projects are announced without a published figure, and a guessed number is worse
  -- than an absent one.
  capital_cost_cr   NUMERIC(12,2) CHECK (capital_cost_cr >= 0),

  -- Dates as far as they are known. All nullable for the same reason.
  announced_on      DATE,
  expected_on       DATE,
  completed_on      DATE,

  source_id         INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  -- The exact page that supports THIS row, not just the publisher's home page. DS-1 in
  -- spirit: a reader must be able to check the claim, not merely learn who made it.
  evidence_url      TEXT NOT NULL,
  -- When a human last confirmed `evidence_url` still says what this row claims. Distinct
  -- from `fetched_at` on ingested data, because these are curated by hand (DS-2).
  verified_on       DATE NOT NULL,

  created_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  -- A completed project cannot be missing its completion date, and vice versa: the status
  -- and the dates must tell the same story, because the UI reads both.
  CONSTRAINT completed_has_date CHECK (
    (status <> 'operational') OR (completed_on IS NOT NULL)
  )
);

-- A project belongs to as many districts as it touches. The expressway serves Dehradun AND
-- Haridwar, and attributing it to one would understate the other — so this is many-to-many
-- rather than a district column, exactly as `alert_areas` is.
CREATE TABLE development_project_areas (
  project_id  INTEGER NOT NULL REFERENCES development_projects(id) ON DELETE CASCADE,
  area_id     INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  -- TRUE where the project physically sits, FALSE where it is served by it. A hotel
  -- investor wants the first; a resident weighing a move wants both.
  is_primary  BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (project_id, area_id)
);

CREATE INDEX idx_project_sector_status ON development_projects (sector, status);
CREATE INDEX idx_project_areas_area ON development_project_areas (area_id);

CREATE TRIGGER development_projects_updated_at BEFORE UPDATE ON development_projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ROLLBACK
-- DROP TABLE IF EXISTS development_project_areas;
-- DROP TABLE IF EXISTS development_projects;
-- DROP TYPE IF EXISTS project_confidence;
-- DROP TYPE IF EXISTS project_sector;
-- DROP TYPE IF EXISTS project_status;
