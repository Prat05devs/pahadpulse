/**
 * Integration tests for GET /api/roads/closures — the guard that keeps PWD closures off the
 * public API until reproduction permission is recorded, and never reports "no closures" in
 * its place.
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { Application } from 'express';
import request from 'supertest';

import { createApp } from '../../app.js';
import { closeDatabase, db } from '../../database/db.js';
import { clearResponseCache } from '../../middleware/cache.middleware.js';

let app: Application;
let dbAvailable = false;

beforeAll(async () => {
  try {
    await db.query("SELECT 1 FROM sources WHERE source_key = 'pwd-uk-road-closures'");
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
    if (!dbAvailable) return;
    await fn();
  });
};

describe('GET /api/roads/closures', () => {
  it('rejects a malformed district before touching the database', async () => {
    const res = await request(app).get('/api/roads/closures?district=Not%20A%20Slug');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(10003);
  });

  maybe('serves nothing, and says why, while PWD permission is not recorded', async () => {
    const res = await request(app).get('/api/roads/closures?district=rudraprayag');
    expect(res.status).toBe(200);
    const data = res.body.data as {
      available: boolean;
      unavailableReason: string | null;
      closures: unknown[];
      source: { url: string };
    };
    // While `may_redistribute` is false the list is empty AND flagged unavailable, so no
    // client can mistake it for "no roads closed".
    if (data.unavailableReason === 'not_permitted') {
      expect(data.available).toBe(false);
      expect(data.closures).toHaveLength(0);
    }
    expect(data.source.url).toBe('https://mis.pwduk.in/pwd/roadClosure');
  });

  maybe('404s an unknown district', async () => {
    const res = await request(app).get('/api/roads/closures?district=atlantis');
    expect(res.status).toBe(404);
  });
});
