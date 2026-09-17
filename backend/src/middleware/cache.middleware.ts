import type { RequestHandler } from 'express';
import NodeCache from 'node-cache';

import { CACHE_MAX_ENTRIES } from '../config/constants.js';

/**
 * In-process response cache. Single instance only — swap for Redis when scaled out
 * (guidelines/common/13-approved-libraries.md).
 */
const cache = new NodeCache({
  stdTTL: 0,
  checkperiod: 120,
  useClones: false,
  maxKeys: CACHE_MAX_ENTRIES,
});

export function cacheMiddleware(ttlSeconds: number): RequestHandler {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    const key = req.originalUrl;
    const hit = cache.get<unknown>(key);
    if (hit !== undefined) {
      res.setHeader('x-cache', 'HIT');
      res.json(hit);
      return;
    }

    res.setHeader('x-cache', 'MISS');
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      // At the ceiling `set` throws ECACHEFULL. The response is still correct uncached, so a
      // full cache must never turn a successful read into a 500.
      if (
        res.statusCode >= 200 &&
        res.statusCode < 300 &&
        cache.getStats().keys < CACHE_MAX_ENTRIES
      ) {
        cache.set(key, body, ttlSeconds);
      }
      return originalJson(body);
    };
    next();
  };
}

/** Used by tests and by future ingestion runs that invalidate geography. */
export function clearResponseCache(): void {
  cache.flushAll();
}
