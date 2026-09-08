/**
 * Integration tests for measured network performance — real router, real database.
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

interface Connection {
  kind: string;
  quarterStart: string;
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  vintage: string;
  sample: { tiles: number; tests: number; devices: number; strength: string };
  provenance: { mayRedistribute: boolean; attribution: string } | null;
}

interface District {
  slug: string;
  connections: Connection[];
}

describe('GET /api/connectivity', () => {
  maybe('never serves a speed without the sample behind it', async () => {
    const res = await request(app).get('/api/connectivity');
    expect(res.status).toBe(200);

    const districts = res.body.data.districts as District[];
    expect(districts.length).toBeGreaterThan(0);

    for (const district of districts) {
      for (const connection of district.connections) {
        // The whole reason this module has its own table. Dehradun rests on 17,700 tests
        // and Rudraprayag on 261; a speed shown without that is an anecdote.
        expect(connection.sample.tests).toBeGreaterThan(0);
        expect(connection.sample.tiles).toBeGreaterThan(0);
        expect(['strong', 'moderate', 'thin']).toContain(connection.sample.strength);
      }
    }
  });

  maybe('dates each figure to the quarter it describes', async () => {
    const res = await request(app).get('/api/connectivity');
    for (const district of res.body.data.districts as District[]) {
      for (const connection of district.connections) {
        // DS-2: the vintage is the END of the quarter the measurements cover, not the day
        // the aggregation happened to run.
        const start = new Date(`${connection.quarterStart}T00:00:00Z`);
        const expected = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 0));
        expect(connection.vintage).toBe(expected.toISOString().slice(0, 10));
      }
    }
  });

  maybe('carries the attribution the licence requires', async () => {
    const res = await request(app).get('/api/connectivity');
    const connection = (res.body.data.districts as District[])[0]?.connections[0];
    // CC BY-NC-SA obliges attribution. If provenance ever came back null the UI would have
    // nothing to render, and using the data would breach the licence.
    expect(connection?.provenance?.mayRedistribute).toBe(true);
    expect(connection?.provenance?.attribution).toMatch(/Ookla/i);
  });

  maybe('compares one quarter against itself, never two', async () => {
    const res = await request(app).get('/api/connectivity');
    const quarters = new Set(
      (res.body.data.districts as District[]).flatMap((district) =>
        district.connections.map((connection) => connection.quarterStart),
      ),
    );
    // A table headed by one quarter must not mix in another district's older figure.
    expect(quarters.size).toBe(1);
    expect([...quarters][0]).toBe(res.body.data.quarterStart);
  });

  maybe('derives the spread from the districts it actually served', async () => {
    const res = await request(app).get('/api/connectivity');
    const districts = res.body.data.districts as District[];

    for (const spread of res.body.data.spread as Array<{
      kind: string;
      fastest: { slug: string; downloadMbps: number };
      slowest: { slug: string; downloadMbps: number };
      ratio: number;
    }>) {
      const speeds = districts
        .flatMap((district) => district.connections)
        .filter((connection) => connection.kind === spread.kind)
        .map((connection) => connection.downloadMbps);

      expect(spread.fastest.downloadMbps).toBe(Math.max(...speeds));
      expect(spread.slowest.downloadMbps).toBe(Math.min(...speeds));
      // The headline ratio must be recomputable from the visible rows, or the page is
      // asserting a gap the table does not show.
      expect(spread.ratio).toBeCloseTo(
        Number((spread.fastest.downloadMbps / spread.slowest.downloadMbps).toFixed(1)),
        1,
      );
    }
  });

  maybe('names districts that were never measured', async () => {
    const res = await request(app).get('/api/connectivity');
    const measured = new Set((res.body.data.districts as District[]).map((d) => d.slug));
    for (const missing of res.body.data.notMeasured as Array<{ slug: string }>) {
      // Named, not dropped — same rule as the migration list.
      expect(measured.has(missing.slug)).toBe(false);
    }
    expect(measured.size + (res.body.data.notMeasured as unknown[]).length).toBe(13);
  });
});

describe('GET /api/areas/:slug/connectivity', () => {
  maybe('gives a district both connection types', async () => {
    const res = await request(app).get('/api/areas/dehradun/connectivity');
    expect(res.status).toBe(200);
    const kinds = (res.body.data.connections as Connection[]).map((c) => c.kind).sort();
    expect(kinds).toEqual(['fixed', 'mobile']);
  });

  maybe('404s an unknown place', async () => {
    const res = await request(app).get('/api/areas/not-a-district/connectivity');
    // A place that does not exist is not the same as a place nobody tested from.
    expect(res.status).toBe(404);
  });
});
