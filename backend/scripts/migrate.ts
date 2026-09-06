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

import { db } from '../src/database/db.js';
import createLogger from '../src/utils/logger.js';

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

async function run(): Promise<void> {
  const client = await db.connect();
  try {
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

    logger.info('migrations complete', { applied: count, total: files.length });
  } finally {
    client.release();
    await db.end();
  }
}

run().catch((error: unknown) => {
  logger.error('migration failed', { error });
  process.exit(1);
});
