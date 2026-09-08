/**
 * Integration tests for the migration surveys — real router, real database.
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

interface Figures {
  surveyKey: string;
  temporaryPersons: number;
  temporaryPanchayats: number;
  permanentPersons: number;
  permanentPanchayats: number;
}

interface DistrictRow {
  slug: string;
  coverage: string;
  figures: Figures[];
  change: { temporaryPersons: number; permanentPersons: number } | null;
}

interface Breakdown {
  dimension: string;
  isShare: boolean;
  values: Array<{ categoryKey: string; label: { en: string; hi: string }; value: number }>;
}

describe('GET /api/migration', () => {
  maybe('serves every district, including any with no figures yet', async () => {
    const res = await request(app).get('/api/migration');
    expect(res.status).toBe(200);

    const districts = res.body.data.districts as DistrictRow[];
    // The state has thirteen districts, and a comparison built from this list must have a
    // row for each whatever the data does — a district silently dropped would make a
    // comparison wrong without saying so.
    expect(districts).toHaveLength(13);
    for (const district of districts) {
      expect(['covered', 'partial', 'not_yet_available']).toContain(district.coverage);
      if (district.coverage === 'not_yet_available') expect(district.figures).toHaveLength(0);
    }
  });

  maybe('totals equal the sum of the districts actually served', async () => {
    const res = await request(app).get('/api/migration');
    const districts = res.body.data.districts as DistrictRow[];
    const totals = res.body.data.totals as Array<{
      surveyKey: string;
      temporaryPersons: number;
      permanentPersons: number;
    }>;

    for (const total of totals) {
      const rows = districts.flatMap((district) =>
        district.figures.filter((figure) => figure.surveyKey === total.surveyKey),
      );
      // Summed from what is on screen, not copied from the report: if DS-6 drops a source,
      // the headline must move with the districts rather than contradict them.
      expect(rows.reduce((sum, row) => sum + row.temporaryPersons, 0)).toBe(total.temporaryPersons);
      expect(rows.reduce((sum, row) => sum + row.permanentPersons, 0)).toBe(total.permanentPersons);
    }
  });

  maybe('reproduces the totals the commission states for itself', async () => {
    const res = await request(app).get('/api/migration');
    const totals = res.body.data.totals as Array<{
      surveyKey: string;
      temporaryPersons: number;
      permanentPersons: number;
    }>;
    const byKey = new Map(totals.map((total) => [total.surveyKey, total]));

    // The published state figures. These are the transcription's only external check: if a
    // digit were mistyped anywhere in the seed, one of these four numbers would move.
    expect(byKey.get('round-2018')).toMatchObject({
      temporaryPersons: 383726,
      permanentPersons: 118981,
    });
    expect(byKey.get('round-2022')).toMatchObject({
      temporaryPersons: 307310,
      permanentPersons: 28531,
    });
  });

  maybe('serves no round whose source forbids redistribution', async () => {
    const res = await request(app).get('/api/migration');
    for (const survey of res.body.data.surveys) {
      // DS-6.
      expect(survey.provenance?.mayRedistribute).toBe(true);
      // DS-2: the vintage is what the figures describe — the end of the field window —
      // not the day the report was printed.
      expect(survey.vintage).toBe(survey.coversTo);
    }
  });
});

describe('GET /api/areas/:slug/migration', () => {
  maybe('gives a district both rounds, with shares that sum to 100', async () => {
    const res = await request(app).get('/api/areas/almora/migration');
    expect(res.status).toBe(200);
    expect(res.body.data.coverage).toBe('covered');
    expect(res.body.data.coverageNote).toBeNull();

    for (const round of res.body.data.rounds) {
      for (const breakdown of round.breakdowns as Breakdown[]) {
        if (!breakdown.isShare) continue;
        const sum = breakdown.values.reduce((total, value) => total + value.value, 0);
        // The reports round each share to two decimals, so a column can land a hundredth
        // either side of 100. Anything further means a category was lost or double-counted.
        expect(Math.abs(sum - 100)).toBeLessThanOrEqual(0.05);
      }
    }
  });

  maybe('keeps village conditions out of the share check', async () => {
    const res = await request(app).get('/api/areas/almora/migration');
    const round = res.body.data.rounds[0];
    const conditions = (round.breakdowns as Breakdown[]).find(
      (breakdown) => breakdown.dimension === 'village_condition',
    );
    // These are counts of villages, and they overlap on purpose: a village with neither a
    // road nor electricity is counted under both. Treating them as a composition would
    // invent a total that means nothing.
    expect(conditions?.isShare).toBe(false);
    expect(conditions?.values.length).toBeGreaterThan(0);
  });

  maybe('labels every category in both languages', async () => {
    const res = await request(app).get('/api/areas/tehri-garhwal/migration');
    for (const round of res.body.data.rounds) {
      for (const breakdown of round.breakdowns as Breakdown[]) {
        for (const value of breakdown.values) {
          expect(value.label.en.length).toBeGreaterThan(0);
          // A Hindi reader must never meet an empty label; these are seeded, not fallen back.
          expect(value.label.hi.length).toBeGreaterThan(0);
        }
      }
    }
  });

  maybe('never lines the two rounds up on occupation', async () => {
    const res = await request(app).get('/api/areas/dehradun/migration');
    const keys = (res.body.data.rounds as Array<{ breakdowns: Breakdown[] }>).map((round) =>
      (round.breakdowns.find((breakdown) => breakdown.dimension === 'occupation')?.values ?? [])
        .map((value) => value.categoryKey)
        .sort(),
    );
    // The two rounds asked different questions about occupation: 2022 merged farming,
    // horticulture and dairy and added MGNREGA. Sharing a category key between them would
    // let a chart plot a trend that does not exist.
    const shared = keys[0]?.filter((key) => keys[1]?.includes(key)) ?? [];
    expect(shared).toEqual([]);
  });

  maybe('reports change between rounds, and 404s an unknown place', async () => {
    const res = await request(app).get('/api/areas/pauri-garhwal/migration');
    // Pauri's permanent migration fell sharply between the rounds; the sign matters, so
    // the direction is asserted rather than just the presence of a number.
    expect(res.body.data.change.permanentPersons).toBeLessThan(0);

    // A place that does not exist is not the same answer as a place with no figures.
    const missing = await request(app).get('/api/areas/not-a-district/migration');
    expect(missing.status).toBe(404);
  });
});
