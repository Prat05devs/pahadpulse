import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';

import { CACHE_TTL } from '../config/constants.js';
import * as networkController from '../controllers/network.controller.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { validateRequest } from '../middleware/validate-request.middleware.js';
import { successResponse } from '../utils/response.js';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SCHEMA = {
  SLUG_PARAM: z.object({
    slug: z.string().min(1).max(128).regex(SLUG, 'slug must be a valid slug'),
  }),
};

const connectivityRouter = Router();

/**
 * Measured internet performance for every district, latest quarter.
 *
 * Cached hard: Ookla publishes once a quarter, so this cannot change between requests.
 * Every figure carries the sample it rests on — the API has no shape that returns a speed
 * without one.
 */
connectivityRouter.get(
  '/',
  cacheMiddleware(CACHE_TTL.STATIC),
  async (_req: Request, res: Response, next: NextFunction) => {
    const result = await networkController.listStateNetwork();
    result.match(
      (data) => {
        res.json(successResponse(data, 'Network performance fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

const areaConnectivityRouter = Router();

/**
 * One district's measurements, newest quarter first.
 *
 * A district that exists but was never tested returns 200 with an empty `connections`
 * array, not 404 — "nobody ran a speed test here" is an answer about a real place. An
 * unknown slug still 404s from the area lookup.
 */
areaConnectivityRouter.get(
  '/:slug/connectivity',
  cacheMiddleware(CACHE_TTL.STATIC),
  validateRequest({ params: SCHEMA.SLUG_PARAM }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.validated.params as z.infer<typeof SCHEMA.SLUG_PARAM>;
    const result = await networkController.getAreaNetwork(slug);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Area connectivity fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

export { areaConnectivityRouter };
export default connectivityRouter;
