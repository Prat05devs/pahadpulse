import { type NextFunction, type Request, type Response, Router } from 'express';

import { CACHE_TTL_ALERTS, CACHE_TTL_FIRES, CACHE_TTL_MAP_DISTRICTS } from '../config/constants.js';
import * as mapController from '../controllers/map.controller.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { successResponse } from '../utils/response.js';

const mapRouter = Router();

/**
 * The district layer, as one GeoJSON FeatureCollection.
 *
 * Cached hard: a district boundary changing is a government act, not a user action.
 */
mapRouter.get(
  '/districts',
  cacheMiddleware(CACHE_TTL_MAP_DISTRICTS),
  async (_req: Request, res: Response, next: NextFunction) => {
    const result = await mapController.getDistrictFeatures();
    result.match(
      (data) => {
        res.json(successResponse(data, 'District boundaries fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

/**
 * The active-alert layer. Cached for the same 60s as the alert endpoints — long enough to
 * survive a front-page spike during an incident, short enough to stay current.
 */
mapRouter.get(
  '/alerts',
  cacheMiddleware(CACHE_TTL_ALERTS),
  async (_req: Request, res: Response, next: NextFunction) => {
    const result = await mapController.getAlertFeatures();
    result.match(
      (data) => {
        res.json(successResponse(data, 'Alert geometry fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

/**
 * Satellite fire detections from the last 48 hours. Cached for five minutes: FIRMS adds a
 * pass at most every half hour, and a fire-season spike in traffic must not become a
 * database spike too.
 */
mapRouter.get(
  '/fires',
  cacheMiddleware(CACHE_TTL_FIRES),
  async (_req: Request, res: Response, next: NextFunction) => {
    const result = await mapController.getFireFeatures();
    result.match(
      (data) => {
        res.json(successResponse(data, 'Fire detections fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

export default mapRouter;
