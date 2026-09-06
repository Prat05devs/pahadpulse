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

export { areaWeatherRouter };
