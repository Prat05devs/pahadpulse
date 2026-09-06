-- 024 — two more indicator categories: `geography` and `environment`.
--
-- Migration 006 defined six categories, all of them fitting the district demography and
-- services indicators that existed at the time. The state profile panel needs two figures
-- that none of the six describes: the state's AREA, and its FOREST COVER.
--
-- Widening the ENUM rather than filing them under an existing category. `demography` was
-- the closest by elimination, and that is exactly the wrong reason to choose it: land area
-- is not a fact about people, and category drives how indicators are grouped in the UI, so
-- a mis-filed row is a permanently mis-grouped one. An ENUM that has to lie to accept a
-- legitimate value is an ENUM that is too narrow.
--
-- Additive and safe: adding members to the end of an ENUM does not rewrite existing rows,
-- and every value already stored keeps its meaning.

ALTER TABLE indicators
  MODIFY COLUMN category ENUM(
    'demography','education','health','economy','industry','connectivity',
    'geography','environment'
  ) NOT NULL;

-- ROLLBACK
-- Only safe while no row uses the two new members.
-- ALTER TABLE indicators
--   MODIFY COLUMN category ENUM(
--     'demography','education','health','economy','industry','connectivity'
--   ) NOT NULL;
