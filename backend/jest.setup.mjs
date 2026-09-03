/**
 * Test-environment defaults.
 *
 * `src/config/env.ts` fails fast on missing configuration, which is correct for the server
 * but would kill the test workers. These defaults let the suite boot; the integration tests
 * then detect an unreachable database themselves and skip.
 */
process.env.NODE_ENV ??= 'test';
process.env.APP_ENV ??= 'local';
process.env.PORT ??= '3000';
process.env.SERVER_URL ??= 'http://localhost:3000';
process.env.DB_HOST ??= 'localhost';
process.env.DB_PORT ??= '3306';
process.env.DB_USER ??= 'root';
process.env.DB_PASSWORD ??= '';
process.env.DB_NAME ??= 'pahad_pulse';
process.env.CORS_ORIGIN ??= 'http://localhost:3001';
