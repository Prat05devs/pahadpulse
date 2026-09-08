-- 038 — out-migration: what the Rural Development and Migration Commission's household
-- surveys found in each district, and how that changed between the two rounds.
--
-- WHY NOT INDICATOR VALUES.
--
-- `indicator_values` holds one number per indicator, area and vintage. Most of this data is
-- not one number: "why did people leave" is eight shares that must sum to 100 and are
-- meaningless read apart, and "where did they go" is five more. Splitting a composition
-- across thirteen unrelated indicator keys loses the one property that makes it readable —
-- that the parts belong to a single question and account for all of it. Nothing in
-- `indicator_values` can express that, and nothing there can enforce it.
--
-- The headline counts (how many people, from how many gram panchayats) ARE scalars and
-- could have lived there. They are here instead so that a district's migration figures and
-- the breakdown explaining them cannot drift apart between two tables with different
-- vintages.
--
-- WHY A SURVEY IS AN ENTITY, NOT A DATE.
--
-- These are two field surveys, not a continuous series: the first covers 2008-2018, the
-- second 2018 to September 2022. Each has a field window, a published date and a differing
-- coverage — the second reached 7,759 gram panchayats across 95 blocks, the first covered
-- the whole state. A reader comparing the rounds must be able to see that, so coverage is
-- stored on the survey rather than assumed equal.
--
-- WHICH DIMENSIONS MAY BE COMPARED ACROSS ROUNDS.
--
-- The two rounds asked about occupation with DIFFERENT categories. 2018 split
-- agriculture / horticulture / dairy and asked separately about labour; 2022 merged farming,
-- horticulture and livestock into one option and added MGNREGA and self-employment, which
-- did not exist as choices in 2018. The numbers are therefore not a trend, and the category
-- keys are deliberately distinct so that no query can accidentally line them up. Migration
-- COUNTS are comparable — the commission itself publishes them side by side — and the
-- reasons, ages and destinations were asked only in 2018.

CREATE TYPE migration_dimension AS ENUM (
  -- Shares, summing to 100 within a survey and district.
  'reason',
  'age',
  'destination',
  'occupation',
  -- Counts of revenue villages/toks/majras, NOT shares. Independent of each other:
  -- a village with neither road nor electricity is counted under both.
  'village_condition'
);

/*
 * A round of the commission's state-wide survey.
 *
 * `gram_panchayats_surveyed` and `blocks_surveyed` are the round's own coverage, nullable
 * because the 2018 report states its results without stating a denominator. A null here
 * means "the report did not say", never zero.
 */
CREATE TABLE migration_surveys (
  id                       INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  survey_key               VARCHAR(32) NOT NULL UNIQUE,
  label_en                 VARCHAR(160) NOT NULL,
  label_hi                 VARCHAR(160) NOT NULL,

  -- The window the FIELDWORK describes, which is what every figure below is about (DS-2).
  covers_from              DATE NOT NULL,
  covers_to                DATE NOT NULL,
  published_on             DATE NOT NULL,

  gram_panchayats_surveyed INTEGER CHECK (gram_panchayats_surveyed > 0),
  blocks_surveyed          INTEGER CHECK (blocks_surveyed > 0),

  source_id                INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  /* The exact document this round's figures were read out of. */
  evidence_url             VARCHAR(500) NOT NULL,

  created_at               TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at               TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  CONSTRAINT ck_survey_window CHECK (covers_to > covers_from),
  CONSTRAINT ck_survey_published CHECK (published_on >= covers_to)
);

CREATE TRIGGER migration_surveys_updated_at BEFORE UPDATE ON migration_surveys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

/*
 * The survey instrument's answer options, with their bilingual labels.
 *
 * A catalogue table rather than a TypeScript constant for the same reason `indicators` is
 * one: these labels are bilingual CONTENT, and content that a Hindi reader sees belongs
 * beside the data it labels, not compiled into the API.
 *
 * `sort_order` is the order the option appears in the printed report. Charts must follow it
 * rather than sorting by value, so that the same category sits in the same place when a
 * reader moves between two districts.
 */
CREATE TABLE migration_categories (
  category_key  VARCHAR(48) PRIMARY KEY,
  dimension     migration_dimension NOT NULL,
  label_en      VARCHAR(160) NOT NULL,
  label_hi      VARCHAR(160) NOT NULL,
  sort_order    SMALLINT NOT NULL,
  /* Explains a category whose printed name is too terse to stand alone. */
  note_en       VARCHAR(400),

  created_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  CONSTRAINT uq_category_dimension_order UNIQUE (dimension, sort_order)
);

CREATE TRIGGER migration_categories_updated_at BEFORE UPDATE ON migration_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

/*
 * The headline counts for one district in one round.
 *
 * Temporary and permanent migration are counted separately by the commission and mean
 * different things: temporary migrants keep the house and return; permanent migrants have
 * sold the land or locked the house. Summing them would be wrong, so no column here does.
 *
 * Both a person count and a gram panchayat count are stored for each. The person count says
 * how many left; the gram panchayat count says how widely spread that is, and the two move
 * independently — between the rounds Almora's temporary migrant count barely moved while
 * the number of gram panchayats affected rose.
 */
CREATE TABLE migration_district_figures (
  survey_id                INTEGER NOT NULL REFERENCES migration_surveys(id) ON DELETE CASCADE,
  area_id                  INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,

  temporary_persons        INTEGER NOT NULL CHECK (temporary_persons >= 0),
  temporary_panchayats     INTEGER NOT NULL CHECK (temporary_panchayats >= 0),
  permanent_persons        INTEGER NOT NULL CHECK (permanent_persons >= 0),
  permanent_panchayats     INTEGER NOT NULL CHECK (permanent_panchayats >= 0),

  /* Blocks reporting migration in this district this round. Null where the round's report
     gives no block count, which is the case throughout the 2018 report. */
  blocks_reporting         SMALLINT CHECK (blocks_reporting > 0),

  created_at               TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at               TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  PRIMARY KEY (survey_id, area_id)
);

CREATE INDEX idx_migration_figures_area ON migration_district_figures (area_id, survey_id);

CREATE TRIGGER migration_district_figures_updated_at BEFORE UPDATE ON migration_district_figures
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

/*
 * One answer: this survey, this district, this category.
 *
 * `value` carries a share for the four share dimensions and a village count for
 * `village_condition`. One column rather than two nullable ones, because every consumer
 * reads it the same way and the dimension already says how to render it — a `share` and a
 * `count` column would let a row set both and mean nothing.
 *
 * NUMERIC(7,2) holds a percentage to two decimals as printed, and village counts (the
 * largest is 186) without loss.
 */
CREATE TABLE migration_observations (
  survey_id     INTEGER NOT NULL REFERENCES migration_surveys(id) ON DELETE CASCADE,
  area_id       INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  category_key  VARCHAR(48) NOT NULL REFERENCES migration_categories(category_key) ON DELETE RESTRICT,

  value         NUMERIC(7,2) NOT NULL CHECK (value >= 0),

  created_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  PRIMARY KEY (survey_id, area_id, category_key)
);

-- The district panel: every answer for one district in one round, in printed order.
CREATE INDEX idx_migration_obs_area ON migration_observations (area_id, survey_id, category_key);
-- Rankings: one category across all districts in one round.
CREATE INDEX idx_migration_obs_category ON migration_observations (category_key, survey_id, value DESC);

CREATE TRIGGER migration_observations_updated_at BEFORE UPDATE ON migration_observations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ROLLBACK
-- DROP TABLE IF EXISTS migration_observations, migration_district_figures,
--   migration_categories, migration_surveys;
-- DROP TYPE IF EXISTS migration_dimension;
