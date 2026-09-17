import type { ErrorRequestHandler } from 'express';

import { ERRORS, isRequestError, RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';
import { errorResponse } from '../utils/response.js';

const logger = createLogger('@error');

/**
 * Postgres SQLSTATEs and socket errors that mean "the database is unreachable or refusing
 * work" rather than "this query is wrong". The MySQL codes this used to check
 * (`ER_DUP_ENTRY`, `PROTOCOL_CONNECTION_LOST`) are never produced by `pg`.
 */
const DATABASE_UNAVAILABLE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  '08000', // connection_exception
  '08003', // connection_does_not_exist
  '08006', // connection_failure
  '53300', // too_many_connections
  '57P01', // admin_shutdown
  '57P03', // cannot_connect_now
]);

/** Postgres `unique_violation`. */
const PG_UNIQUE_VIOLATION = '23505';

/** Maps known third-party throwables onto registry errors. */
function mapKnownThrowable(error: unknown): RequestError | null {
  if (error instanceof SyntaxError && 'body' in error) {
    return ERRORS.INVALID_REQUEST_BODY;
  }
  if (typeof error !== 'object' || error === null) return null;

  // body-parser rejects an oversized body with this type; unmapped it surfaced as a 500.
  if ('type' in error && error.type === 'entity.too.large') return ERRORS.PAYLOAD_TOO_LARGE;

  if ('code' in error && typeof error.code === 'string') {
    if (error.code === PG_UNIQUE_VIOLATION) return ERRORS.DUPLICATE_RESOURCE;
    if (DATABASE_UNAVAILABLE_CODES.has(error.code)) return ERRORS.DATABASE_ERROR;
  }
  return null;
}

/** The ONLY place an error becomes a response body. Registered last in app.ts. */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const requestId = req.id;

  if (isRequestError(error)) {
    if (error.statusCode >= 500) {
      logger.error('request failed', { requestId, code: error.code, path: req.path, error });
    } else {
      logger.warn('request rejected', { requestId, code: error.code, path: req.path });
    }
    res.status(error.statusCode).json(errorResponse(error.message, error.code, requestId));
    return;
  }

  const mapped = mapKnownThrowable(error);
  if (mapped !== null) {
    logger.warn('mapped throwable', { requestId, code: mapped.code, path: req.path });
    res.status(mapped.statusCode).json(errorResponse(mapped.message, mapped.code, requestId));
    return;
  }

  // Never echo an unknown throwable's message to the client, in any environment.
  logger.error('unhandled error', {
    requestId,
    path: req.path,
    method: req.method,
    error: error instanceof Error ? error.message : String(error),
  });
  res
    .status(500)
    .json(errorResponse(ERRORS.UNHANDLED_ERROR.message, ERRORS.UNHANDLED_ERROR.code, requestId));
};
