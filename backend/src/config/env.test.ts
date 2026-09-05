import { spawnSync } from 'node:child_process';

import { describe, expect, it } from '@jest/globals';

// Use an isolated process so startup validation runs each time, without reading local secrets
// or opening a database connection. Capture the options passed to the real driver's factory.
function readSslConfig(overrides: Record<string, string> = {}) {
  return spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '-e',
      `import mysql from 'mysql2/promise';
       let options;
       mysql.createPool = (value) => { options = value; return {}; };
       await import('./src/database/db.ts');
       process.stdout.write(JSON.stringify(options.ssl ?? null));`,
    ],
    {
      encoding: 'utf8',
      env: {
        NODE_ENV: 'test',
        DOTENV_CONFIG_PATH: '/dev/null',
        DB_HOST: 'db.example.test',
        DB_USER: 'test',
        DB_PASSWORD: '',
        DB_NAME: 'test',
        ...overrides,
      },
    },
  );
}

describe('database TLS configuration', () => {
  it.each([{}, { DB_SSL: 'false' }])('supports local MySQL without TLS: %j', (config) => {
    const result = readSslConfig(config);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toBeNull();
  });

  it('requires certificate and hostname verification when TLS is enabled', () => {
    const result = readSslConfig({ DB_SSL: 'true' });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ rejectUnauthorized: true, verifyIdentity: true });
  });

  it.each(['first\\nsecond', 'first\nsecond'])('normalizes provider CA newlines: %j', (ca) => {
    const result = readSslConfig({ DB_SSL: 'true', DB_SSL_CA: ca });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      rejectUnauthorized: true,
      verifyIdentity: true,
      ca: 'first\nsecond',
    });
  });

  it('rejects a typo instead of silently disabling TLS', () => {
    const result = readSslConfig({ DB_SSL: 'treu' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('DB_SSL');
  });
});
