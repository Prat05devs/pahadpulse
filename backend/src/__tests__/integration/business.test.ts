/**
 * Integration tests for the business comparison route's input validation. These requests are
 * rejected before any database read, so they run without a database.
 */
import { describe, expect, it } from '@jest/globals';
import request from 'supertest';

import { createApp } from '../../app.js';

const app = createApp();

describe('GET /api/business/compare', () => {
  it('rejects a request with missing query parameters as a 400, not a server error', async () => {
    const res = await request(app).get('/api/business/compare?districtA=dehradun');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(10003);
  });

  it('rejects comparing a district with itself', async () => {
    const res = await request(app).get(
      '/api/business/compare?districtA=dehradun&districtB=dehradun&scenarioId=homestay',
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(10003);
  });
});
