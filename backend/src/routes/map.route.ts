import { type NextFunction, type Request, type Response, Router } from 'express';

import { CACHE_TTL, CACHE_TTL_ALERTS, CACHE_TTL_MAP_DISTRICTS } from '../config/constants.js';
import * as areaController from '../controllers/area.controller.js';
import * as mapController from '../controllers/map.controller.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { successResponse } from '../utils/response.js';

const mapRouter = Router();

mapRouter.get(
  '/layers',
  cacheMiddleware(CACHE_TTL.STATIC),
  async (_req: Request, res: Response, next: NextFunction) => {
    const result = await areaController.listMapLayers();
    result.match(
      (data) => {
        res.json(successResponse(data, 'Map layers fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

/**
 * The district layer, as one GeoJSON FeatureCollection.
 *
 * Cached hard for the same reason as `/layers`: a district boundary changing is a government
 * act, not a user action.
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

export default mapRouter;
