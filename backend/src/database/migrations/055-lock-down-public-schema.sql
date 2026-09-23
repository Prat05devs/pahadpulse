-- Close the public schema to Supabase's API roles.
--
-- WHAT WAS WRONG. Supabase exposes every table in `public` through PostgREST, and grants
-- `anon`, `authenticated` and `service_role` full table privileges by default. The anon key
-- is public by design — it ships in any client — so with Row-Level Security off, anyone with
-- the project URL could read, edit and delete every row: the source registry, every alert,
-- and the push tokens added one migration ago. Supabase's own linter reported it as
-- `rls_disabled_in_public`, critical, on 19 September 2026.
--
-- WHY THIS IS SAFE FOR THE API. Nothing in this product uses PostgREST: the backend connects
-- over the Postgres protocol as the role that owns these tables. Postgres does not enforce
-- RLS against a table's owner (no FORCE ROW LEVEL SECURITY here) or against a role with
-- BYPASSRLS, and the application role is both. The assertion below fails the deploy rather
-- than silently locking the API out of its own database if that ever stops being true.
--
-- WHY BOTH RLS AND REVOKE. RLS alone would leave the grants in place, so a future policy —
-- or a table created before its RLS line runs — is exposed again. Revoking the privileges
-- removes the reach; RLS is the second lock behind it. The default privileges are changed
-- too, because that is what re-granted `anon` access to every table these migrations create.

DO $$
DECLARE
  target record;
  has_api_roles boolean;
BEGIN
  -- A local or CI Postgres has no Supabase roles. The RLS half still applies there.
  SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('anon', 'authenticated'))
    INTO has_api_roles;

  FOR target IN
    SELECT tablename
      FROM pg_tables
     WHERE schemaname = 'public'
       AND tableowner = current_user
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target.tablename);
    IF has_api_roles THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', target.tablename);
    END IF;
  END LOOP;

  IF has_api_roles THEN
    -- Stops the next migration's table from arriving pre-shared with the public internet.
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'REVOKE USAGE ON SCHEMA public FROM anon, authenticated';
  END IF;
END $$;

/*
 * Fail the deploy rather than serve an empty site.
 *
 * If the API ever connects as a role that is neither the owner of these tables nor holds
 * BYPASSRLS, the RLS enabled above would deny it every row — and with no policies defined,
 * every endpoint would return empty results rather than an error, which is the worst way to
 * find out. Better to refuse to migrate.
 */
DO $$
DECLARE
  unreachable integer;
BEGIN
  SELECT count(*)
    INTO unreachable
    FROM pg_tables t
   WHERE t.schemaname = 'public'
     AND t.rowsecurity
     AND t.tableowner <> current_user
     AND NOT EXISTS (
       SELECT 1 FROM pg_roles WHERE rolname = current_user AND (rolsuper OR rolbypassrls)
     );

  IF unreachable > 0 THEN
    RAISE EXCEPTION
      'RLS is enabled on % table(s) this role neither owns nor can bypass; the API would read nothing',
      unreachable;
  END IF;
END $$;

-- ROLLBACK
-- DO $$
-- DECLARE target record;
-- BEGIN
--   FOR target IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tableowner = current_user
--   LOOP
--     EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', target.tablename);
--   END LOOP;
-- END $$;
-- Re-granting anon/authenticated is deliberately NOT part of this rollback: it would put the
-- database back on the public internet, and nothing in this product needs those grants.
