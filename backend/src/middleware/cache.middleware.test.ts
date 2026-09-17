import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// A ceiling of 2 so the test can reach it; the real value is sized for production.
jest.unstable_mockModule('../config/constants.js', () => ({ CACHE_MAX_ENTRIES: 2 }));

const { cacheMiddleware, clearResponseCache } = await import('./cache.middleware.js');

function appWithCache(): express.Application {
  const app = express();
  let calls = 0;
  app.get('/thing', cacheMiddleware(60), (_req, res) => {
    calls += 1;
    res.json({ calls });
  });
  return app;
}

beforeEach(() => {
  clearResponseCache();
});

describe('cacheMiddleware', () => {
  it('serves a repeated GET from the cache', async () => {
    const app = appWithCache();

    await request(app).get('/thing');
    const second = await request(app).get('/thing');

    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.body).toEqual({ calls: 1 });
  });

  /**
   * Every query-string variant is its own key. Unbounded, `?x=1`, `?x=2`, … grows memory
   * for as long as the TTL; at the ceiling responses must still succeed, just uncached.
   */
  it('stops caching new keys at the ceiling and still answers 200', async () => {
    const app = appWithCache();

    await request(app).get('/thing?x=1');
    await request(app).get('/thing?x=2');
    const overflow = await request(app).get('/thing?x=3');
    const overflowAgain = await request(app).get('/thing?x=3');

    expect(overflow.status).toBe(200);
    expect(overflowAgain.status).toBe(200);
    expect(overflowAgain.headers['x-cache']).toBe('MISS');

    const stillCached = await request(app).get('/thing?x=1');
    expect(stillCached.headers['x-cache']).toBe('HIT');
  });
});
