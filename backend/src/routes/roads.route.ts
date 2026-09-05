import { type NextFunction, type Request, type Response, Router } from 'express';

import { CACHE_TTL } from '../config/constants.js';
import * as roadController from '../controllers/road.controller.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
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
      }
    );
  }
);

export default roadRouter;
