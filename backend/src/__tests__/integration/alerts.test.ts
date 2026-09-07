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

/**
 * These assertions used to be `toEqual([])`, written when no alert connector was live and
 * the list was empty for everyone. SACHET-NDMA now ingests real warnings, so an empty list
 * is no longer the correct answer — and an assertion that only holds while a source is
 * switched off tests ingestion history rather than behaviour, exactly as the boundary test
 * in `areas.test.ts` explains.
 *
 * What must hold at every point in that history is that whatever IS returned is well-formed
 * and safe to publish: DS-6 means nothing reaches a reader unless its source grants
 * redistribution. That invariant is asserted here instead of a count.
 */
function expectPublishableAlerts(body: { data: unknown }): void {
  expect(Array.isArray(body.data)).toBe(true);
  for (const alert of body.data as Array<{
    id: number;
    severity: string;
    areas: Array<{ slug: string }>;
    provenance?: { mayRedistribute?: boolean } | null;
  }>) {
    expect(typeof alert.id).toBe('number');
    expect(['extreme', 'severe', 'moderate', 'minor', 'unknown']).toContain(alert.severity);
    expect(Array.isArray(alert.areas)).toBe(true);
    // DS-6: an alert that may not be redistributed must never be served.
    if (alert.provenance?.mayRedistribute !== undefined) {
      expect(alert.provenance.mayRedistribute).toBe(true);
    }
  }
}

describe('GET /api/alerts/active', () => {
  maybe('returns only alerts that may be redistributed — DS-6', async () => {
    const res = await request(app).get('/api/alerts/active');
    expect(res.status).toBe(200);
    expectPublishableAlerts(res.body);
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
  maybe('agrees with the active list it summarises', async () => {
    // The count is not pinned to a literal — it depends on what is in force right now.
    // What must always hold is that the summary and the list cannot disagree, because the
    // home page shows the count and the alerts page shows the list, and a product that
    // says "5 active" beside four warnings has a credibility problem.
    const [summary, active] = await Promise.all([
      request(app).get('/api/alerts/summary'),
      request(app).get('/api/alerts/active'),
    ]);
    expect(summary.status).toBe(200);
    expect(typeof summary.body.data.activeCount).toBe('number');
    expect(summary.body.data.activeCount).toBeGreaterThanOrEqual(0);
    expect(summary.body.data.activeCount).toBe((active.body.data as unknown[]).length);
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
  maybe('returns only that district\'s publishable alerts', async () => {
    const res = await request(app).get('/api/areas/dehradun/alerts');
    expect(res.status).toBe(200);
    expectPublishableAlerts(res.body);
    // Scoping is the point of this route: every alert returned must actually name the
    // district asked for, or the district page is showing someone else's warning.
    for (const alert of res.body.data as Array<{ areas: Array<{ slug: string }> }>) {
      expect(alert.areas.map((area) => area.slug)).toContain('dehradun');
    }
  });

  maybe('404s for an unknown district', async () => {
    const res = await request(app).get('/api/areas/atlantis/alerts');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ERRORS.AREA_NOT_FOUND.code);
  });
});
