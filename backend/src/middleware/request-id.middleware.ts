import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

/**
 * An upstream proxy's id is kept so a request can be traced end to end, but only if it looks
 * like an id. The value is caller-controlled and is written into every log line and echoed
 * as a response header, so an arbitrary one could forge log fields or bloat both.
 */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.headers['x-request-id'];
  req.id = typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
};
