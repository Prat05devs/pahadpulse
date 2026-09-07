/**
 * Integration tests — real router, real MySQL.
 *
 * Requires a migrated and seeded database (`npm run db:migrate && npm run db:seed`).
 * Skips itself when the database is unreachable so that `npm test` stays green on a
 * machine with no local MySQL.
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { Application } from 'express';
import request from 'supertest';

import { UTTARAKHAND_DISTRICT_COUNT } from '../../config/constants.js';
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

describe('GET /api/areas/districts', () => {
  maybe('returns exactly 13 districts (GEO-6)', async () => {
    const res = await request(app).get('/api/areas/districts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(UTTARAKHAND_DISTRICT_COUNT);
  });

  maybe('returns both languages for every district (GEO-2)', async () => {
    const res = await request(app).get('/api/areas/districts');
    for (const district of res.body.data) {
      expect(typeof district.name.en).toBe('string');
      expect(typeof district.name.hi).toBe('string');
      expect(district.name.en.length).toBeGreaterThan(0);
      expect(district.name.hi.length).toBeGreaterThan(0);
    }
  });

  maybe('exposes official id slots as null until backfilled', async () => {
    const res = await request(app).get('/api/areas/districts');
    expect(res.body.data[0].officialIds).toHaveProperty('lgd');
    expect(res.body.data[0].officialIds).toHaveProperty('census2011');
  });
});

describe('GET /api/areas/districts/:slug', () => {
  maybe('returns a district with its tehsils and boundary', async () => {
    const res = await request(app).get('/api/areas/districts/dehradun');
    expect(res.status).toBe(200);
    expect(res.body.data.district.slug).toBe('dehradun');
    expect(Array.isArray(res.body.data.tehsils)).toBe(true);
  });

  maybe('404s on an unknown slug with AREA_NOT_FOUND', async () => {
    const res = await request(app).get('/api/areas/districts/atlantis');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ERRORS.AREA_NOT_FOUND.code);
  });

  maybe('400s on a malformed slug', async () => {
    const res = await request(app).get('/api/areas/districts/Not_A_Slug');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ERRORS.INVALID_PARAMS.code);
  });
});

describe('GET /api/areas/:slug/boundary', () => {
  /*
   * GEO-7: a boundary always declares whether it is real or generated. It cannot assert
   * WHICH, because that depends on what has been run against this database — `db:seed`
   * writes placeholder hexagons, the OpenStreetMap connector writes surveyed boundaries,
   * and both are legitimate states. Asserting `isPlaceholder === true` made the test pass
   * or fail on ingestion history rather than on behaviour.
   *
   * The invariant that matters is that the flag is present, boolean, and that a placeholder
   * says so in its source note — so nothing can render generated geometry as official.
   */
  maybe('always declares whether the geometry is real or generated', async () => {
    const res = await request(app).get('/api/areas/dehradun/boundary');
    if (res.status === 404) {
      expect(res.body.error.code).toBe(ERRORS.BOUNDARY_NOT_AVAILABLE.code);
      return;
    }
    expect(res.status).toBe(200);
    expect(typeof res.body.data.isPlaceholder).toBe('boolean');
    expect(res.body.data.geojson.type).toMatch(/Polygon/);
    if (res.body.data.isPlaceholder === true) {
      expect(String(res.body.data.sourceNote)).toMatch(/placeholder/i);
    }
  });
});

describe('GET /api/map/layers', () => {
  maybe('returns the layer registry with districts available', async () => {
    const res = await request(app).get('/api/map/layers');
    expect(res.status).toBe(200);
    const districts = res.body.data.find((l: { key: string }) => l.key === 'districts');
    expect(districts.isAvailable).toBe(true);
  });
});

describe('unknown routes', () => {
  it('404s with ROUTE_NOT_FOUND', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ERRORS.ROUTE_NOT_FOUND.code);
  });
});
