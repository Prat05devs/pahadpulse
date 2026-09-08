/**
 * Integration tests for pilgrim arrivals — real router, real database.
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

interface Destination {
  slug: string;
  type: string;
  district: { slug: string };
  years: Array<{
    year: number;
    visitors: number;
    vintage: string;
    provenance: { mayRedistribute: boolean } | null;
  }>;
}

describe('GET /api/tourism/pilgrim-arrivals', () => {
  maybe('reproduces the yearly totals the report states', async () => {
    const res = await request(app).get('/api/tourism/pilgrim-arrivals');
    expect(res.status).toBe(200);

    const totals = res.body.data.totals as Array<{ year: number; visitors: number }>;
    const byYear = new Map(totals.map((total) => [total.year, total.visitors]));
    // The transcription's external check: a mistyped digit at any shrine moves one of these.
    expect(byYear.get(2019)).toBe(3477957);
    expect(byYear.get(2020)).toBe(330039);
    expect(byYear.get(2021)).toBe(529382);
  });

  maybe('totals equal the sum of the destinations actually served', async () => {
    const res = await request(app).get('/api/tourism/pilgrim-arrivals');
    const destinations = res.body.data.destinations as Destination[];

    for (const total of res.body.data.totals as Array<{ year: number; visitors: number }>) {
      const sum = destinations
        .flatMap((destination) => destination.years)
        .filter((entry) => entry.year === total.year)
        .reduce((running, entry) => running + entry.visitors, 0);
      // A headline must never describe rows the reader cannot see (DS-6).
      expect(sum).toBe(total.visitors);
    }
  });

  maybe('dates each figure to the year it describes, not a day inside it', async () => {
    const res = await request(app).get('/api/tourism/pilgrim-arrivals');
    for (const destination of res.body.data.destinations as Destination[]) {
      for (const entry of destination.years) {
        // DS-2. A yearly total has no finer date; 31 December is the end of what it covers,
        // and nothing may present it as an event on a particular day.
        expect(entry.vintage).toBe(`${entry.year}-12-31`);
        expect(entry.provenance?.mayRedistribute).toBe(true);
      }
      // Oldest first, so a caller can lay out columns without re-sorting.
      const years = destination.years.map((entry) => entry.year);
      expect(years).toEqual([...years].sort((a, b) => a - b));
    }
  });

  maybe('keeps the pandemic collapse rather than smoothing it', async () => {
    const res = await request(app).get('/api/tourism/pilgrim-arrivals');
    const totals = res.body.data.totals as Array<{ year: number; visitors: number }>;
    const before = totals.find((total) => total.year === 2019)?.visitors ?? 0;
    const during = totals.find((total) => total.year === 2020)?.visitors ?? 0;
    // Arrivals fell roughly tenfold when the yatra was suspended. That shape is the finding,
    // so it is asserted — a seed that quietly interpolated the gap would fail here.
    expect(during).toBeLessThan(before / 5);
  });

  maybe('puts every shrine in a real district', async () => {
    const res = await request(app).get('/api/tourism/pilgrim-arrivals');
    const destinations = res.body.data.destinations as Destination[];
    expect(destinations.length).toBeGreaterThan(0);

    const areas = await request(app).get('/api/areas/districts');
    const slugs = new Set(
      (areas.body.data as Array<{ slug: string }>).map((district) => district.slug),
    );
    for (const destination of destinations) {
      // Two shrines share a district, so a district total is a sum — an orphaned shrine
      // would silently drop out of that sum instead of failing loudly.
      expect(slugs.has(destination.district.slug)).toBe(true);
    }
  });
});
