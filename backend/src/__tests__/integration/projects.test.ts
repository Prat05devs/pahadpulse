/**
 * Integration tests for the development register — real router, real database.
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

interface ProjectShape {
  slug: string;
  status: string;
  confidence: string;
  capitalCostCr: number | null;
  evidenceUrl: string;
  verifiedOn: string;
  areas: Array<{ slug: string; isPrimary: boolean }>;
  provenance: { mayRedistribute: boolean } | null;
}

describe('GET /api/projects', () => {
  maybe('serves every project with the evidence supporting it', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(200);

    const projects = res.body.data.projects as ProjectShape[];
    expect(projects.length).toBeGreaterThan(0);

    for (const project of projects) {
      // The register's whole claim to credibility. A row a reader cannot check is worse
      // than no row, so this is asserted rather than assumed.
      expect(project.evidenceUrl).toMatch(/^https?:\/\//);
      expect(project.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['official', 'reported', 'indicative']).toContain(project.confidence);
      // DS-6: nothing is served whose source forbids redistribution.
      expect(project.provenance?.mayRedistribute).toBe(true);
    }
  });

  maybe('gives every project at least one district', async () => {
    // A project register whose defining axis is the district cannot hold an orphan: it
    // would be invisible to every comparison while still inflating the totals.
    const res = await request(app).get('/api/projects');
    for (const project of res.body.data.projects as ProjectShape[]) {
      expect(project.areas.length).toBeGreaterThan(0);
      expect(project.areas.some((area) => area.isPrimary)).toBe(true);
    }
  });

  maybe('keeps a shared project against every district it touches', async () => {
    // The expressway serves Dehradun and Haridwar. Crediting one would understate the
    // other, which is the exact error a district comparison must not make.
    const res = await request(app).get('/api/projects');
    const expressway = (res.body.data.projects as ProjectShape[]).find(
      (project) => project.slug === 'delhi-dehradun-expressway',
    );
    expect(expressway).toBeDefined();
    const slugs = expressway?.areas.map((area) => area.slug) ?? [];
    expect(slugs).toContain('dehradun');
    expect(slugs).toContain('haridwar');
  });

  maybe('summary counts agree with the list they summarise', async () => {
    const res = await request(app).get('/api/projects');
    const projects = res.body.data.projects as ProjectShape[];
    const summary = res.body.data.summary;

    expect(summary.total).toBe(projects.length);
    expect(summary.operational).toBe(
      projects.filter((project) => project.status === 'operational').length,
    );
    expect(summary.underConstruction).toBe(
      projects.filter((project) => project.status === 'under_construction').length,
    );
    expect(summary.active).toBe(
      projects.filter(
        (project) => project.status !== 'cancelled' && project.status !== 'stalled',
      ).length,
    );
  });

  maybe('never reports an investment total as zero when none was published', async () => {
    // A zero here would read as "no investment"; it means "no cost was published". The
    // count of projects that actually disclosed one must travel with the total, or the
    // figure invites a reader to divide by the wrong denominator.
    const res = await request(app).get('/api/projects');
    const summary = res.body.data.summary;
    const withCost = (res.body.data.projects as ProjectShape[]).filter(
      (project) => project.capitalCostCr !== null,
    );

    expect(summary.withDisclosedCost).toBe(withCost.length);
    if (withCost.length === 0) {
      expect(summary.disclosedCapitalCr).toBeNull();
    } else {
      expect(summary.disclosedCapitalCr).toBeGreaterThan(0);
    }
  });
});
