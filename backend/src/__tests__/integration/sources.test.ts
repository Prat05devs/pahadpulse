/**
 * Integration tests — real router, real MySQL.
 *
 * Requires a migrated database (`npm run db:migrate`). Skips itself when the database is
 * unreachable so that `npm test` stays green on a machine with no local MySQL.
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { Application } from 'express';
import request from 'supertest';

import { createApp } from '../../app.js';
import { closeDatabase, db } from '../../database/db.js';
import { clearResponseCache } from '../../middleware/cache.middleware.js';
import { ERRORS } from '../../utils/errors.js';

let app: Application;
let dbAvailable = false;

const SEEDED_KEYS = ['data-gov-in', 'imd-cap-alerts', 'openstreetmap'];

beforeAll(async () => {
  try {
    await db.query('SELECT 1');
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
  app = createApp();
  clearResponseCache();
});

afterAll(async () => {
  if (dbAvailable) await closeDatabase();
});

const maybe = (name: string, fn: () => Promise<void>) => {
  it(name, async () => {
    if (!dbAvailable) {
      console.warn(`skipped (no database): ${name}`);
      return;
    }
    await fn();
  });
};

describe('GET /api/sources', () => {
  /*
   * Asserts the seeded sources are PRESENT, not that they are the only ones. The previous
   * version compared the whole set for exact equality and so failed the moment a source was
   * added — which is a normal, frequent event on this platform and not a regression. A test
   * that has to be edited every time the system grows correctly is a test that will
   * eventually be edited without being read.
   */
  maybe('includes every seeded source', async () => {
    const res = await request(app).get('/api/sources');
    expect(res.status).toBe(200);
    const keys = (res.body.data as { key: string }[]).map((s) => s.key);
    for (const seeded of SEEDED_KEYS) {
      expect(keys).toContain(seeded);
    }
  });

  /*
   * DS-3: freshness is derived from the last successful run, never stored. A source that
   * has never run reports `unknown` with a null timestamp; one that has run reports a real
   * state and a timestamp. The invariant is that the two always agree — asserting a
   * database-wide `unknown` only held before any ingestion had ever happened.
   */
  maybe('derives freshness from the last successful run', async () => {
    const res = await request(app).get('/api/sources');
    for (const source of res.body.data as { freshness: string; lastSuccessAt: string | null }[]) {
      if (source.lastSuccessAt === null) {
        expect(source.freshness).toBe('unknown');
      } else {
        expect(source.freshness).not.toBe('unknown');
      }
    }
  });

  /*
   * Every source is provisional until someone confirms its terms with the publishing body.
   * The exception is a source whose licence is a published, self-contained grant needing no
   * conversation — Open-Meteo's CC-BY-4.0 and USGS's public domain — so the assertion is
   * that nothing is `verified` WITHOUT such a licence, not that nothing is verified.
   */
  maybe('leaves sources provisional unless their licence is self-contained', async () => {
    const res = await request(app).get('/api/sources');
    for (const source of res.body.data as { metadataStatus: string; licence: string }[]) {
      if (source.metadataStatus === 'verified') {
        expect(source.licence).toMatch(/Creative Commons|public domain/i);
      }
    }
  });

  /** DS-6 — IMD redistribution is unconfirmed, so it must not be publishable. */
  maybe('keeps the IMD feed non-redistributable', async () => {
    const res = await request(app).get('/api/sources');
    const imd = (res.body.data as { key: string; mayRedistribute: boolean }[]).find(
      (s) => s.key === 'imd-cap-alerts',
    );
    expect(imd?.mayRedistribute).toBe(false);
  });

  maybe('never exposes credentials or connector internals', async () => {
    const res = await request(app).get('/api/sources');
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('metadataNote');
    expect(body).not.toContain('apiKey');
    expect(body).not.toContain('isEnabled');
  });

  maybe('returns both languages for every department', async () => {
    const res = await request(app).get('/api/sources');
    for (const source of res.body.data as { department: { en: string; hi: string } }[]) {
      expect(source.department.en.length).toBeGreaterThan(0);
      expect(source.department.hi.length).toBeGreaterThan(0);
    }
  });
});

describe('GET /api/sources/:key', () => {
  maybe('returns one source with its attribution string', async () => {
    const res = await request(app).get('/api/sources/openstreetmap');
    expect(res.status).toBe(200);
    expect(res.body.data.key).toBe('openstreetmap');
    expect(res.body.data.attribution).toContain('OpenStreetMap');
  });

  maybe('404s on an unknown key with SOURCE_NOT_FOUND', async () => {
    const res = await request(app).get('/api/sources/not-a-source');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ERRORS.SOURCE_NOT_FOUND.code);
  });

  maybe('400s on a malformed key', async () => {
    const res = await request(app).get('/api/sources/Not_A_Key');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ERRORS.INVALID_PARAMS.code);
  });
});
