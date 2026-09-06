import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';

import { CACHE_TTL_SEISMIC } from '../config/constants.js';
import * as seismicController from '../controllers/seismic.controller.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { validateRequest } from '../middleware/validate-request.middleware.js';
import { successResponse } from '../utils/response.js';

const seismicRouter = Router();

const SCHEMA = {
  RECENT_QUERY: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    minMagnitude: z.coerce.number().min(0).max(10).optional(),
  }),
} as const;

seismicRouter.get(
  '/recent',
  cacheMiddleware(CACHE_TTL_SEISMIC),
  validateRequest({ query: SCHEMA.RECENT_QUERY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { limit, minMagnitude } = req.validated.query as z.infer<typeof SCHEMA.RECENT_QUERY>;
    const result = await seismicController.getRecentSeismic(limit, minMagnitude);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Recent seismic activity fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

export default seismicRouter;
