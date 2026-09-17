import { describe, expect, it } from '@jest/globals';
import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';

import { ERRORS } from '../utils/errors.js';
import { errorHandler } from './error.middleware.js';
import { requestId } from './request-id.middleware.js';

function appThrowing(error: unknown): express.Application {
  const app = express();
  app.use(requestId);
  app.get('/boom', (_req: Request, _res: Response, next: NextFunction) => {
    next(error);
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler — Postgres throwables', () => {
  it('maps a unique violation (23505) to DUPLICATE_RESOURCE', async () => {
    const response = await request(appThrowing({ code: '23505' })).get('/boom');

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe(ERRORS.DUPLICATE_RESOURCE.code);
  });

  it.each(['ECONNREFUSED', '57P01', '53300'])('maps %s to DATABASE_ERROR', async (code) => {
    const response = await request(appThrowing({ code })).get('/boom');

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe(ERRORS.DATABASE_ERROR.code);
  });

  it('maps an oversized body to PAYLOAD_TOO_LARGE rather than a 500', async () => {
    const response = await request(appThrowing({ type: 'entity.too.large' })).get('/boom');

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe(ERRORS.PAYLOAD_TOO_LARGE.code);
  });

  it('never echoes an unknown error message', async () => {
    const response = await request(appThrowing(new Error('secret connection string'))).get('/boom');

    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });
});

describe('requestId', () => {
  it('keeps a well-formed upstream request id', async () => {
    const response = await request(appThrowing({ code: '23505' }))
      .get('/boom')
      .set('x-request-id', 'render-abc_123:4');

    expect(response.headers['x-request-id']).toBe('render-abc_123:4');
  });

  it.each([['a'.repeat(129)], ['forged value with spaces'], ['id"injected']])(
    'replaces an unsafe upstream id with a generated one (%s)',
    async (incoming) => {
      const response = await request(appThrowing({ code: '23505' }))
        .get('/boom')
        .set('x-request-id', incoming);

      expect(response.headers['x-request-id']).not.toBe(incoming);
      expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    },
  );
});
