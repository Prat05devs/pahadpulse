import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

import { ERRORS } from '../utils/errors.js';

interface ValidationSchemas {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
}

/**
 * Parses each present part of the request and stores the result on `req.validated`.
 * Handlers read `req.validated` and never re-parse (RT4).
 */
export function validateRequest(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    req.validated = {};

    if (schemas.params !== undefined) {
      const parsed = schemas.params.safeParse(req.params);
      if (!parsed.success) {
        next(ERRORS.INVALID_PARAMS);
        return;
      }
      req.validated.params = parsed.data;
    }

    if (schemas.query !== undefined) {
      const parsed = schemas.query.safeParse(req.query);
      if (!parsed.success) {
        next(ERRORS.INVALID_QUERY_PARAMETER);
        return;
      }
      req.validated.query = parsed.data;
    }

    if (schemas.body !== undefined) {
      const parsed = schemas.body.safeParse(req.body);
      if (!parsed.success) {
        next(ERRORS.INVALID_REQUEST_BODY);
        return;
      }
      req.validated.body = parsed.data;
    }

    next();
  };
}
