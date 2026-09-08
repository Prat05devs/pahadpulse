-- 047 — measured internet performance per district, from Speedtest by Ookla open data.
--
-- WHAT THIS IS, AND WHAT IT IS NOT.
--
-- Ookla publishes every Speedtest result aggregated into ~610 m tiles, quarterly. Those
-- tiles are joined here against our OpenStreetMap district polygons, so each district gets
-- the average of the tests actually taken inside it. It is a MEASUREMENT of what people
-- experienced, not a coverage map: it says nothing about places nobody tested from, and it
-- is not an operator's advertised speed.
--
-- WHY THIS IS NOT `indicator_values`.
--
-- A speed without its sample size is not a fact, it is an anecdote. Dehradun's fixed figure
-- rests on 17,700 tests; Rudraprayag's on 261. Both are real, and they are not equally
-- certain. `indicator_values` stores one number per row, so the count would have to live in
-- a separate indicator that a caller could forget to fetch — and the first chart that ranked
-- districts on speed alone would put a 261-test district against a 17,700-test one as though
-- the comparison were sound. Here the sample travels in the same row and the API cannot
-- return the speed without it.
--
-- SELF-SELECTION IS THE STANDING CAVEAT.
--
-- People run a speed test when they suspect something is wrong, or when they have just
-- connected to good wifi. Neither is a random sample of the district's minutes. The figures
-- are comparable BETWEEN districts, because the same bias applies in each; they should not be
-- read as "the speed in this district".
--
-- KBPS AS INTEGERS, EXACTLY AS OOKLA PUBLISHES.
--
-- Stored in the source's own unit and converted to Mbps at the edge. Rounding to Mbps here
-- would throw away precision permanently to save a division.

CREATE TYPE connection_kind AS ENUM ('fixed', 'mobile');

CREATE TABLE network_performance (
  area_id        INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  kind           connection_kind NOT NULL,
  /* The quarter the measurements describe (DS-2), as its first day. Not the day we ran the
     aggregation — a Q2 figure describes April to June whenever it was computed. */
  quarter_start  DATE NOT NULL,

  download_kbps  INTEGER NOT NULL CHECK (download_kbps >= 0),
  upload_kbps    INTEGER NOT NULL CHECK (upload_kbps >= 0),
  latency_ms     INTEGER NOT NULL CHECK (latency_ms >= 0),

  /* The sample behind the three figures above. NOT NULL, all three: this is the whole
     reason the module has its own table. */
  tiles          INTEGER NOT NULL CHECK (tiles > 0),
  tests          INTEGER NOT NULL CHECK (tests > 0),
  devices        INTEGER NOT NULL CHECK (devices > 0),

  source_id      INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  fetched_at     TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  created_at     TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at     TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  -- Idempotent upsert per district, connection type and quarter (DS-5).
  PRIMARY KEY (area_id, kind, quarter_start)
);

-- The district panel: both kinds for one area, newest quarter first.
CREATE INDEX idx_netperf_area ON network_performance (area_id, quarter_start DESC, kind);
-- The state table: every district for one quarter and kind, fastest first.
CREATE INDEX idx_netperf_quarter ON network_performance (quarter_start DESC, kind, download_kbps DESC);

CREATE TRIGGER network_performance_updated_at BEFORE UPDATE ON network_performance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ROLLBACK
-- DROP TABLE IF EXISTS network_performance;
-- DROP TYPE IF EXISTS connection_kind;
