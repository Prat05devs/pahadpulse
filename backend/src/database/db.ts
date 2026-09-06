import pg from 'pg';

import { env } from '../config/env.js';
import createLogger from '../utils/logger.js';

const logger = createLogger('@database');

/**
 * Postgres type parsers.
 *
 * `pg` returns most types as strings by default and hands back JS `Date` objects for
 * timestamps. Both defaults are wrong for this codebase, so they are overridden once here
 * rather than compensated for in seven repositories.
 *
 * TIMESTAMP (1114) and TIMESTAMPTZ (1184) are returned as raw strings, matching the
 * `dateStrings: true` contract the MySQL pool had. Every timestamp in this system is UTC
 * by convention and is converted deliberately at the edges by `toIsoUtc` — letting the
 * driver build a `Date` in the server's local zone is exactly the silent shift that
 * `toIsoUtc` exists to prevent.
 *
 * int8 (20) is left as a string by default because it can exceed `Number.MAX_SAFE_INTEGER`.
 * Every count in this schema is far below that, and a string count breaks arithmetic
 * downstream, so it is parsed.
 */
pg.types.setTypeParser(1114, (value: string) => value);
pg.types.setTypeParser(1184, (value: string) => value);
pg.types.setTypeParser(20, (value: string) => Number.parseInt(value, 10));

/*
 * DATE (1082) as a plain `YYYY-MM-DD` string.
 *
 * Left to itself `pg` builds a JS `Date` at LOCAL midnight, which for any timezone east of
 * UTC rolls the date backwards on serialisation: a Census vintage of 2011-03-01 came back
 * as `2011-02-28T18:30:00.000Z` in IST. Every vintage in this system is a calendar date
 * with no time and no zone — the day a figure describes, not an instant — so the string
 * the database holds is exactly the right representation and any Date is a lossy one.
 */
pg.types.setTypeParser(1082, (value: string) => value);

/**
 * NUMERIC (1700) stays a string in `pg` to preserve arbitrary precision. Every numeric
 * column here is a bounded measurement — a temperature, a magnitude, an indicator value —
 * and the models already call `Number()` on them, so leaving them as strings keeps that
 * conversion explicit and in one place rather than making it a driver behaviour.
 */

export const db = new pg.Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  max: env.DB_POOL_LIMIT,
  /**
   * Supabase terminates idle server-side connections, and a pooled client that has been
   * dropped upstream fails on its next use. Recycling well before that turns a confusing
   * mid-query error into a silent reconnect.
   */
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ...(env.DB_SSL
    ? {
        ssl: {
          rejectUnauthorized: true,
          ...(env.DB_SSL_CA ? { ca: env.DB_SSL_CA } : {}),
        },
      }
    : {}),
});

/**
 * A pool error is not a query error: it fires for a connection that dies while idle, with
 * no caller waiting on it. Unhandled, it takes the process down — which on Render means the
 * API restarts because a spare socket timed out.
 */
db.on('error', (error) => {
  logger.error('idle client error', { error: error.message });
});

export async function connectToDatabase(): Promise<void> {
  const client = await db.connect();
  try {
    // `SET TIME ZONE 'UTC'` is not needed per-connection: the schema stores naive
    // timestamps and the app converts at the edges, so the session zone never applies.
    await client.query('SELECT 1');
    logger.info('database connected', { database: env.DB_NAME, env: env.APP_ENV });
  } finally {
    client.release();
  }
}

export async function closeDatabase(): Promise<void> {
  await db.end();
}
