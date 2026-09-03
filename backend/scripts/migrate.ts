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

import type { RowDataPacket } from 'mysql2';

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

interface AppliedRow extends RowDataPacket {
  filename: string;
}

/** Strips `--` comments, then splits on `;`. Migration files contain no string literals with `;`. */
function splitStatements(sql: string): string[] {
  return sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function run(): Promise<void> {
  const connection = await db.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    const [appliedRows] = await connection.query<AppliedRow[]>(
      'SELECT filename FROM schema_migrations',
    );
    const applied = new Set(appliedRows.map((row) => row.filename));

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      for (const statement of splitStatements(sql)) {
        await connection.query(statement);
      }
      await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
      logger.info('migration applied', { file });
      count += 1;
    }

    logger.info('migrations complete', { applied: count, total: files.length });
  } finally {
    connection.release();
    await db.end();
  }
}

run().catch((error: unknown) => {
  logger.error('migration failed', { error });
  process.exit(1);
});
