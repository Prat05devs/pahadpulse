/**
 * Integration tests — real router, real MySQL.
 *
 * Requires a migrated database (`npm run db:migrate`). Skips itself when the database is
 * unreachable so that `npm test` stays green on a machine with no local MySQL.
 *
 * These do NOT run live ingestion (`npm run ingest -- imd-cap-alerts`) themselves — that is
 * a real network call to IMD and does not belong in the test suite. They assert on the
 * documented DS-6 consequence instead: whatever ingestion has or hasn't stored, the public
 * API only ever shows alerts from a redistributable source, and today none are.
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

describe('GET /api/alerts/active', () => {
  maybe('succeeds with an empty list — DS-6 (IMD redistribution unconfirmed)', async () => {
    const res = await request(app).get('/api/alerts/active');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  maybe('400s on an invalid severity filter', async () => {
    const res = await request(app).get('/api/alerts/active?minSeverity=catastrophic');
    expect(res.status).toBe(400);
  });

  maybe('400s on an invalid type filter', async () => {
    const res = await request(app).get('/api/alerts/active?type=earthquake');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/alerts/summary', () => {
  maybe('reports zero active alerts — DS-6', async () => {
    const res = await request(app).get('/api/alerts/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.activeCount).toBe(0);
  });
});

describe('GET /api/alerts/:id', () => {
  maybe('404s on an unknown id', async () => {
    const res = await request(app).get('/api/alerts/999999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ERRORS.ALERT_NOT_FOUND.code);
  });

  maybe('400s on a non-numeric id', async () => {
    const res = await request(app).get('/api/alerts/not-a-number');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/areas/:slug/alerts', () => {
  maybe('succeeds for a real district with an empty list', async () => {
    const res = await request(app).get('/api/areas/dehradun/alerts');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  maybe('404s for an unknown district', async () => {
    const res = await request(app).get('/api/areas/atlantis/alerts');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ERRORS.AREA_NOT_FOUND.code);
  });
});
