-- 048 — `quarterly` joins the cadence enum.
--
-- Speedtest open data is published once a quarter. Filing it as `monthly` would have the
-- freshness badge call it stale about seventy days after every release, and `annual` would
-- keep calling a nine-month-old figure fresh. Neither is true, and freshness is a claim this
-- product makes on every panel, so the cadence that actually exists gets a label.
--
-- Its own migration because Postgres refuses to use an enum label in the transaction that
-- added it, and the runner sends each file as one transaction.

ALTER TYPE cadence ADD VALUE IF NOT EXISTS 'quarterly' AFTER 'monthly';

-- ROLLBACK
-- Postgres cannot drop a value from an enum. Reverting means recreating the type.
