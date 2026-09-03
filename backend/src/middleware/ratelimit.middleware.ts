import rateLimit from 'express-rate-limit';

import { RATE_LIMIT } from '../config/constants.js';
import { ERRORS } from '../utils/errors.js';

export const limiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  limit: RATE_LIMIT.MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ERRORS.RATE_LIMITED);
  },
});
