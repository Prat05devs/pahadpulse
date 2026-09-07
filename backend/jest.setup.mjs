/**
 * Test-environment configuration.
 *
 * The real `.env` is loaded FIRST, so the integration suites run against the configured
 * database instead of skipping. They had skipped on every machine since they were written:
 * this file only ever set `localhost:3306` — a MySQL port, left behind by the Postgres
 * migration — and nothing listens there, so `db.query('SELECT 1')` failed, every `maybe()`
 * test returned early, and the suite still reported them as passes. A green run therefore
 * said nothing at all about the API's behaviour against a real database, which is the one
 * thing those tests exist to check.
 *
 * The literal defaults below remain as a fallback. `src/config/env.ts` fails fast on missing
 * configuration, which is right for the server but would kill the workers, so a checkout
 * with no `.env` still boots and skips honestly rather than erroring.
 */
import 'dotenv/config';

process.env.NODE_ENV ??= 'test';
process.env.APP_ENV ??= 'local';
process.env.PORT ??= '3000';
process.env.SERVER_URL ??= 'http://localhost:3000';
process.env.DB_HOST ??= 'localhost';
// 5432, not 3306: this project is Postgres.
process.env.DB_PORT ??= '5432';
process.env.DB_USER ??= 'postgres';
process.env.DB_PASSWORD ??= '';
process.env.DB_NAME ??= 'pahad_pulse';
process.env.CORS_ORIGIN ??= 'http://localhost:3001';
