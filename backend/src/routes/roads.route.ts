import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';

import { CACHE_TTL } from '../config/constants.js';
import * as roadController from '../controllers/road.controller.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { validateRequest } from '../middleware/validate-request.middleware.js';
import { successResponse } from '../utils/response.js';

const roadRouter = Router();

/**
 * The highway network — which National and State Highways run through Uttarakhand.
 *
 * Cached hard: a highway being renumbered is a government act, not a user action, and the
 * upstream is refreshed monthly at most. This endpoint deliberately says nothing about
 * whether any road is OPEN — closures are a separate, manually-reported dataset with no feed.
 */
roadRouter.get(
  '/',
  cacheMiddleware(CACHE_TTL.STATIC),
  async (_req: Request, res: Response, next: NextFunction) => {
    const result = await roadController.listRoadNetwork();
    result.match(
      (data) => {
        res.json(successResponse(data, 'Road network fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

const CLOSURES_QUERY = z.object({
  district: z
    .string()
    .max(128)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'district must be a valid slug')
    .optional(),
});

/**
 * Road closures as reported to PWD Uttarakhand, optionally for one district.
 *
 * Cached for two minutes only: the source is polled every ten, and a reopened road must not
 * be held as "closed" by our own cache. `available: false` means the list must not be read
 * as the state of the roads — see `listRoadClosures`.
 */
roadRouter.get(
  '/closures',
  cacheMiddleware(2 * 60),
  validateRequest({ query: CLOSURES_QUERY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { district } = req.validated.query as z.infer<typeof CLOSURES_QUERY>;
    const result = await roadController.listRoadClosures(district ?? null);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Road closures fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

export default roadRouter;
