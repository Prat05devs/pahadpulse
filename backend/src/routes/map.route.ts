import { type NextFunction, type Request, type Response, Router } from 'express';

import { CACHE_TTL } from '../config/constants.js';
import * as areaController from '../controllers/area.controller.js';
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

export default mapRouter;
