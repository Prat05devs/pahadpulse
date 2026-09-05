import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';

import { CACHE_TTL_LIVE_SOURCE_STATUS, CACHE_TTL_SOURCES } from '../config/constants.js';
import * as sourceController from '../controllers/source.controller.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { validateRequest } from '../middleware/validate-request.middleware.js';
import { successResponse } from '../utils/response.js';

const sourceRouter = Router();

const SCHEMA = {
  KEY_PARAM: z.object({
    key: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Source key must be lowercase, hyphen separated'),
  }),
} as const;

sourceRouter.get(
  '/',
  cacheMiddleware(CACHE_TTL_SOURCES),
  async (_req: Request, res: Response, next: NextFunction) => {
    const result = await sourceController.listSources();
    result.match(
      (data) => {
        res.json(successResponse(data, 'Sources fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

sourceRouter.get(
  '/imd-cap-alerts/live',
  cacheMiddleware(CACHE_TTL_LIVE_SOURCE_STATUS),
  async (_req: Request, res: Response, next: NextFunction) => {
    const result = await sourceController.getImdCapLiveStatus();
    result.match(
      (data) => {
        res.json(successResponse(data, 'IMD CAP feed status fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

sourceRouter.get(
  '/:key',
  cacheMiddleware(CACHE_TTL_SOURCES),
  validateRequest({ params: SCHEMA.KEY_PARAM }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { key } = req.validated.params as z.infer<typeof SCHEMA.KEY_PARAM>;
    const result = await sourceController.getSourceByKey(key);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Source fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

export default sourceRouter;
