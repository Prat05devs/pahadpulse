import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';

import { CACHE_TTL_OBSERVATIONS } from '../config/constants.js';
import * as observationController from '../controllers/observation.controller.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { validateRequest } from '../middleware/validate-request.middleware.js';
import { successResponse } from '../utils/response.js';

const SCHEMA = {
  SLUG_PARAM: z.object({
    slug: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase, hyphen separated'),
  }),
} as const;

// --- /api/areas/:slug/weather — mounted separately under `/areas`, same reasoning as
// alerts.route.ts's areaAlertsRouter: geography's own route file stays untouched.
//
// Registering `/:slug/weather` alongside the existing `/:slug` is safe because Express
// matches on segment count — `/almora` cannot match a two-segment pattern — which is the
// same reason the indicators and alerts routers already coexist with it (RT6).

const areaWeatherRouter = Router();

areaWeatherRouter.get(
  '/:slug/weather',
  cacheMiddleware(CACHE_TTL_OBSERVATIONS),
  validateRequest({ params: SCHEMA.SLUG_PARAM }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.validated.params as z.infer<typeof SCHEMA.SLUG_PARAM>;
    const result = await observationController.getAreaWeather(slug);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Weather fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

areaWeatherRouter.get(
  '/:slug/air-quality',
  cacheMiddleware(CACHE_TTL_OBSERVATIONS),
  validateRequest({ params: SCHEMA.SLUG_PARAM }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.validated.params as z.infer<typeof SCHEMA.SLUG_PARAM>;
    const result = await observationController.getAreaAirQuality(slug);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Air quality fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

/*
 * State-wide batch endpoints, on their own paths rather than under `/areas`.
 *
 * `/api/areas/weather` would never reach here: `areaRouter` is mounted first and its
 * `/:slug` route matches any single segment, so the request would resolve as a lookup for
 * an area literally named "weather" and 404 (RT6). These live at the top level instead,
 * which is also the honest place for them — they are hydromet endpoints, not geography.
 */
const stateWeatherRouter = Router();

stateWeatherRouter.get(
  '/districts',
  cacheMiddleware(CACHE_TTL_OBSERVATIONS),
  async (_req: Request, res: Response, next: NextFunction) => {
    const result = await observationController.getAllDistrictWeather();
    result.match(
      (data) => {
        res.json(successResponse(data, 'District weather fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

const stateAirRouter = Router();

stateAirRouter.get(
  '/districts',
  cacheMiddleware(CACHE_TTL_OBSERVATIONS),
  async (_req: Request, res: Response, next: NextFunction) => {
    const result = await observationController.getAllDistrictAirQuality();
    result.match(
      (data) => {
        res.json(successResponse(data, 'District air quality fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

export { areaWeatherRouter, stateWeatherRouter, stateAirRouter };
