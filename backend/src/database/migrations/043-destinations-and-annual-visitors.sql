-- 043 — the pilgrimage destination registry, and published ANNUAL visitor totals.
--
-- WHY ANNUAL TOTALS ARE NOT `visitor_counts`.
--
-- tourism.md plans `visitor_counts` at daily granularity, keyed by `counted_on` with a
-- `basis` of registration or footfall. What exists today is a different thing: a yearly
-- total per shrine, published once. Writing 998,956 into a row dated 2019-12-31 would say
-- a million people arrived at Kedarnath on one day in December, which is both false and
-- exactly the sort of claim a daily table invites. So annual figures get their own table and
-- their own name, and `visitor_counts` stays free for the daily feed when one is obtained.
--
-- WHY THE REGISTRY IS BUILT NOW ANYWAY.
--
-- Both tables need to say WHICH shrine, and both need it to be the same shrine. Seeding the
-- registry here means the daily counts join the rows the annual totals already use, instead
-- of a second list of five spellings of Kedarnath.
--
-- CAPACITY IS NULL, NOT ZERO, AND NOT GUESSED.
--
-- TOU-4: carrying capacity is an official published figure and the platform never estimates
-- one. No capacity is published in this source, so `daily_capacity` is NULL for every row
-- and TOU-3 makes load state `unknown`. A zero would read as "no capacity" and a guess would
-- be the exact thing TOU-4 forbids.

CREATE TYPE destination_type AS ENUM (
  'char_dham',
  'hill_station',
  'trek',
  'wildlife',
  'religious',
  'other'
);

CREATE TABLE destinations (
  id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug                VARCHAR(96) NOT NULL UNIQUE,
  type                destination_type NOT NULL,
  name_en             VARCHAR(128) NOT NULL,
  name_hi             VARCHAR(128) NOT NULL,
  -- The district the shrine sits in. Two of the five share a district with another, which
  -- is why a district's pilgrim total is a SUM over this column and never one row.
  area_id             INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,

  -- Official published figure only (TOU-4). NULL means none has been published.
  daily_capacity      INTEGER CHECK (daily_capacity > 0),
  capacity_source_id  INTEGER REFERENCES sources(id) ON DELETE RESTRICT,

  created_at          TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at          TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  -- A capacity without a source is not displayable (DS-1), so the pair moves together.
  CONSTRAINT ck_capacity_has_source
    CHECK ((daily_capacity IS NULL) = (capacity_source_id IS NULL))
);

CREATE INDEX idx_destination_area ON destinations (area_id, type);

CREATE TRIGGER destinations_updated_at BEFORE UPDATE ON destinations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

/*
 * One published yearly total for one destination.
 *
 * `year` rather than a date, because that is the precision the figure actually has. Storing
 * it as a date would let a reader — or a chart — treat it as a point in time it is not.
 * `vintage` for provenance is derived as the 31 December of that year at read time.
 */
CREATE TABLE destination_annual_visitors (
  destination_id  INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  year            SMALLINT NOT NULL CHECK (year BETWEEN 1900 AND 2100),

  visitors        INTEGER NOT NULL CHECK (visitors >= 0),

  source_id       INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  fetched_at      TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  created_at      TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at      TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  PRIMARY KEY (destination_id, year)
);

CREATE INDEX idx_annual_visitors_year ON destination_annual_visitors (year DESC, visitors DESC);

CREATE TRIGGER destination_annual_visitors_updated_at BEFORE UPDATE ON destination_annual_visitors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ROLLBACK
-- DROP TABLE IF EXISTS destination_annual_visitors, destinations;
-- DROP TYPE IF EXISTS destination_type;
