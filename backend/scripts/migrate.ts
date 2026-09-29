/**
 * Forward-only migration runner.
 *
 * Applied filenames are recorded in `schema_migrations`; a file is never applied twice.
 * Uses a single connection so that session variables (`SET @state_id := ...`) survive
 * across the statements of one migration file.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { escapeIdentifier, type PoolClient } from 'pg';

import { db } from '../src/database/db.js';
import createLogger from '../src/utils/logger.js';
import { describeError } from '../src/utils/describe-error.js';

const logger = createLogger('@migrate');

const MIGRATIONS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'database',
  'migrations',
);

interface AppliedRow {
  filename: string;
}

/**
 * Whether the file is applied as one statement or split into several.
 *
 * Postgres runs a multi-statement string in an implicit transaction, so a whole migration
 * file can be sent at once — which is BETTER than splitting it, because a file that fails
 * halfway then rolls back entirely instead of leaving the schema half-applied.
 *
 * The old MySQL runner had to split on `;` because mysql2 refuses multiple statements. That
 * splitter also could not survive this schema: `set_updated_at()` is a `$$`-quoted function
 * body containing semicolons, and splitting on them would tear it in half. Not splitting at
 * all removes the problem rather than teaching a regex about dollar quoting.
 */
function stripRollbackComments(sql: string): string {
  return sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
    .trim();
}

interface TableRow {
  tablename: string;
}

/**
 * Re-apply migration 055's lockdown to every table this role owns, after every run.
 *
 * 055 relied on each later migration remembering `ENABLE ROW LEVEL SECURITY`. Four did not
 * (056, 057, 059, 067), and Supabase's linter reported `rls_disabled_in_public` again on
 * 27 September 2026. Enforcing it here means a forgotten line can never reach production.
 * Safe for the API for the reason 055 gives: it connects as the owner, which RLS skips.
 */
async function lockDownPublicTables(client: PoolClient): Promise<void> {
  const exposed = await client.query<TableRow>(`
    SELECT tablename
      FROM pg_tables
     WHERE schemaname = 'public'
       AND tableowner = current_user
       AND NOT rowsecurity
  `);
  if (exposed.rows.length === 0) return;

  // A local or CI Postgres has no Supabase roles. The RLS half still applies there.
  const apiRoles = await client.query(
    `SELECT 1 FROM pg_roles WHERE rolname IN ('anon', 'authenticated')`,
  );
  const hasApiRoles = apiRoles.rows.length > 0;

  for (const { tablename } of exposed.rows) {
    const table = escapeIdentifier(tablename);
    await client.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    if (hasApiRoles) {
      await client.query(`REVOKE ALL ON public.${table} FROM anon, authenticated`);
    }
  }

  logger.warn('row-level security enabled on tables a migration left open', {
    tables: exposed.rows.map((row) => row.tablename),
  });
}

async function run(): Promise<void> {
  const client = await db.connect();
  try {
    // Serialize pre-deploy and startup runners on a session connection.
    await client.query('SELECT pg_advisory_lock(724001)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
      )
    `);

    const appliedResult = await client.query<AppliedRow>('SELECT filename FROM schema_migrations');
    const applied = new Set(appliedResult.rows.map((row) => row.filename));

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');

      // Each file is one transaction: a migration that fails partway leaves the schema
      // exactly as it was, rather than half-applied with no record of it.
      await client.query('BEGIN');
      try {
        await client.query(stripRollbackComments(sql));
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }

      logger.info('migration applied', { file });
      count += 1;
    }

    await lockDownPublicTables(client);

    logger.info('migrations complete', { applied: count, total: files.length });
  } finally {
    // Destroy the session to release the advisory lock, including on failure.
    client.release(true);
    await db.end();
  }
}

run().catch((error: unknown) => {
  logger.error('migration failed', { error: describeError(error) });
  process.exit(1);
});
