import { describe, expect, it } from '@jest/globals';
import request from 'supertest';

import { createApp } from './app.js';

describe('public website CORS', () => {
  const app = createApp();

  it.each(['https://pahadpulse.live', 'https://www.pahadpulse.live'])(
    'allows the official website origin %s',
    async (origin) => {
      const response = await request(app).get('/health').set('Origin', origin);

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
    },
  );

  it('answers browser preflight requests from the canonical website', async () => {
    const response = await request(app)
      .options('/api/business/scenarios')
      .set('Origin', 'https://www.pahadpulse.live')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'content-type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('https://www.pahadpulse.live');
  });

  it('does not expose CORS permissions to an unrelated website', async () => {
    const response = await request(app).get('/health').set('Origin', 'https://untrusted.example');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
