-- 053 — Drop two indexes that duplicate their table's primary key.
--
-- `idx_obs_station_metric_time` is (station_id, metric, observed_at DESC) and
-- `observations` already has PRIMARY KEY (station_id, metric, observed_at). A B-tree is
-- scanned in either direction, so "latest reading for this station and metric" is served
-- by the primary key just as well — the DESC copy answers no query the key cannot.
--
-- What it does cost is real: `observations` is the fastest-growing table in the schema
-- (169 rows an hour) and every insert maintained both indexes, doubling index writes and
-- index storage against Supabase's 500 MB free tier. `observations_daily` had the same
-- duplicate of its (station_id, metric, day) key.
--
-- Plain DROP INDEX, not CONCURRENTLY: the runner wraps each file in a transaction, which
-- CONCURRENTLY refuses, and the brief lock on a table this size is not worth a special case.

DROP INDEX IF EXISTS idx_obs_station_metric_time;
DROP INDEX IF EXISTS idx_obs_daily_station_metric_day;

-- ROLLBACK
-- CREATE INDEX idx_obs_station_metric_time ON observations (station_id, metric, observed_at DESC);
-- CREATE INDEX idx_obs_daily_station_metric_day ON observations_daily (station_id, metric, day DESC);
