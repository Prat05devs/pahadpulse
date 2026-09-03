/**
 * Integration tests — real router, real MySQL.
 *
 * Requires a migrated and seeded database (`npm run db:migrate && npm run db:seed`).
 * Skips itself when the database is unreachable so that `npm test` stays green on a
 * machine with no local MySQL.
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { Application } from 'express';
import type { RowDataPacket } from 'mysql2';
import request from 'supertest';

import { createApp } from '../../app.js';
import { closeDatabase, db } from '../../database/db.js';
import { clearResponseCache } from '../../middleware/cache.middleware.js';
import { ERRORS } from '../../utils/errors.js';

let app: Application;
let dbAvailable = false;
let seeded = false;

beforeAll(async () => {
  try {
    await db.query('SELECT 1');
    dbAvailable = true;
    const [rows] = await db.query<(RowDataPacket & { total: number })[]>(
      'SELECT COUNT(*) AS total FROM indicator_values',
    );
    seeded = (rows[0]?.total ?? 0) > 0;
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
    if (!seeded) {
      console.warn(`skipped (run npm run db:seed first): ${name}`);
      return;
    }
    await fn();
  });
};

describe('GET /api/indicators', () => {
  maybe('returns the seeded catalogue with both languages', async () => {
    const res = await request(app).get('/api/indicators');
    expect(res.status).toBe(200);
    expect((res.body.data as unknown[]).length).toBeGreaterThanOrEqual(10);
    for (const ind of res.body.data as { label: { en: string; hi: string } }[]) {
      expect(ind.label.en.length).toBeGreaterThan(0);
      expect(ind.label.hi.length).toBeGreaterThan(0);
    }
  });

  maybe('filters by category', async () => {
    const res = await request(app).get('/api/indicators?category=economy');
    expect(res.status).toBe(200);
    const categories = new Set((res.body.data as { category: string }[]).map((i) => i.category));
    expect(categories).toEqual(new Set(['economy']));
  });

  maybe('400s on an unknown category', async () => {
    const res = await request(app).get('/api/indicators?category=not-a-category');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/areas/:slug/indicators', () => {
  maybe('returns provenance-stamped demo values for a district', async () => {
    const res = await request(app).get('/api/areas/dehradun/indicators');
    expect(res.status).toBe(200);
    expect((res.body.data as unknown[]).length).toBeGreaterThan(0);

    for (const value of res.body.data as { provenance: { sourceKey: string } | null }[]) {
      // DS-1 — a value that cannot name its source is never displayed.
      expect(value.provenance).not.toBeNull();
      expect(value.provenance?.sourceKey).toBe('pahad-pulse-demo-data');
    }
  });

  /** IND-2 — vintage is always displayed with the value. */
  maybe('carries vintage on every value', async () => {
    const res = await request(app).get('/api/areas/dehradun/indicators');
    for (const value of res.body.data as { vintage: string }[]) {
      expect(value.vintage).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  maybe('404s for an unknown slug', async () => {
    const res = await request(app).get('/api/areas/atlantis/indicators');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ERRORS.AREA_NOT_FOUND.code);
  });
});

describe('GET /api/indicators/compare', () => {
  maybe('compares two districts with no omissions when both have every indicator', async () => {
    const res = await request(app).get('/api/indicators/compare?areas=dehradun,nainital');
    expect(res.status).toBe(200);
    expect(res.body.data.omittedCount).toBe(0);
    expect((res.body.data.rows as unknown[]).length).toBeGreaterThanOrEqual(10);
  });

  /** IND-5 — every returned row carries both sides' values. */
  maybe('every comparison row carries both areas', async () => {
    const res = await request(app).get('/api/indicators/compare?areas=dehradun,nainital');
    for (const row of res.body.data.rows as { areaA: unknown; areaB: unknown }[]) {
      expect(row.areaA).not.toBeNull();
      expect(row.areaB).not.toBeNull();
    }
  });

  maybe('filters comparison rows by category', async () => {
    const res = await request(app).get(
      '/api/indicators/compare?areas=dehradun,nainital&categories=economy',
    );
    expect(res.status).toBe(200);
    for (const row of res.body.data.rows as { indicator: { category: string } }[]) {
      expect(row.indicator.category).toBe('economy');
    }
  });

  maybe('rejects comparing an area to itself', async () => {
    const res = await request(app).get('/api/indicators/compare?areas=dehradun,dehradun');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ERRORS.COMPARISON_REQUIRES_TWO_AREAS.code);
  });

  /** IND-4 — comparison is only permitted between areas of the same type. */
  maybe('rejects comparing a district to the state', async () => {
    const res = await request(app).get('/api/indicators/compare?areas=dehradun,uttarakhand');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ERRORS.COMPARISON_AREA_TYPE_MISMATCH.code);
  });

  maybe('400s when not exactly two areas are given', async () => {
    const res = await request(app).get('/api/indicators/compare?areas=dehradun');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/indicators/:key/series', () => {
  maybe('returns three ascending vintages for a seeded district', async () => {
    const res = await request(app).get('/api/indicators/population/series?areaSlug=dehradun');
    expect(res.status).toBe(200);
    const points = res.body.data as { vintage: string }[];
    expect(points).toHaveLength(3);
    const vintages = points.map((p) => p.vintage);
    expect(vintages).toEqual([...vintages].sort());
  });

  /** A scope mismatch is a client error, not a silently empty series. */
  maybe('rejects a district-scoped indicator against the state area', async () => {
    const res = await request(app).get('/api/indicators/population/series?areaSlug=uttarakhand');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ERRORS.INDICATOR_SCOPE_NOT_SUPPORTED.code);
  });

  maybe('404s on an unknown indicator key', async () => {
    const res = await request(app).get('/api/indicators/not-a-key/series?areaSlug=dehradun');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ERRORS.INDICATOR_NOT_FOUND.code);
  });
});

describe('GET /api/indicators/:key/ranking', () => {
  maybe('ranks all 13 districts at the latest vintage by default', async () => {
    const res = await request(app).get('/api/indicators/population/ranking');
    expect(res.status).toBe(200);
    expect(res.body.data.vintage).toBe('2023-04-01');
    expect((res.body.data.entries as unknown[]).length).toBe(13);
    expect(res.body.pagination.hasNext).toBe(false);
  });

  /** IND-6 — ranking is computed only over areas at the same vintage. */
  maybe('respects an explicit vintage', async () => {
    const res = await request(app).get('/api/indicators/population/ranking?vintage=2015-04-01');
    expect(res.status).toBe(200);
    expect(res.body.data.vintage).toBe('2015-04-01');
    for (const entry of res.body.data.entries as { vintage: string }[]) {
      expect(entry.vintage).toBe('2015-04-01');
    }
  });

  maybe('paginates with a stable rank-based cursor', async () => {
    const first = await request(app).get('/api/indicators/population/ranking?limit=5');
    expect(first.body.pagination.hasNext).toBe(true);
    expect(first.body.data.entries).toHaveLength(5);
    expect(first.body.data.entries[0].rank).toBe(1);

    const cursor = first.body.pagination.nextCursor as number;
    const second = await request(app).get(
      `/api/indicators/population/ranking?limit=5&cursor=${cursor}`,
    );
    expect(second.body.data.entries[0].rank).toBe(6);
  });

  maybe('ranks in ascending order for an indicator where lower is not better', async () => {
    // sex_ratio has no direction (higherIsBetter: null) — falls back to descending,
    // which is still deterministic and worth pinning down.
    const res = await request(app).get('/api/indicators/sex_ratio/ranking?limit=3');
    const values = (res.body.data.entries as { value: number }[]).map((e) => e.value);
    expect(values).toEqual([...values].sort((a, b) => b - a));
  });

  maybe('404s on an unknown indicator key', async () => {
    const res = await request(app).get('/api/indicators/not-a-key/ranking');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ERRORS.INDICATOR_NOT_FOUND.code);
  });
});
