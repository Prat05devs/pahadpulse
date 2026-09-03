import type { RequestHandler } from 'express';

import { ERRORS } from '../utils/errors.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(ERRORS.ROUTE_NOT_FOUND);
};
