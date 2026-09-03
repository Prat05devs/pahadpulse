import type { ErrorRequestHandler } from 'express';

import { ERRORS, isRequestError, RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';
import { errorResponse } from '../utils/response.js';

const logger = createLogger('@error');

/** Maps known third-party throwables onto registry errors. */
function mapKnownThrowable(error: unknown): RequestError | null {
  if (error instanceof SyntaxError && 'body' in error) {
    return ERRORS.INVALID_REQUEST_BODY;
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error;
    if (code === 'ER_DUP_ENTRY') return ERRORS.DUPLICATE_RESOURCE;
    if (code === 'ECONNREFUSED' || code === 'PROTOCOL_CONNECTION_LOST') {
      return ERRORS.DATABASE_ERROR;
    }
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
