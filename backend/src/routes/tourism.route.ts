import { type NextFunction, type Request, type Response, Router } from 'express';

import { CACHE_TTL } from '../config/constants.js';
import * as destinationController from '../controllers/destination.controller.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { successResponse } from '../utils/response.js';
import { getTourismGuide } from '../services/tourism-guide.service.js';

const tourismRouter = Router();

tourismRouter.get('/guide', cacheMiddleware(CACHE_TTL.STATIC), (_req: Request, res: Response) => {
  res.json(successResponse(getTourismGuide(), 'Official tourism guide fetched successfully'));
});

tourismRouter.get(
  '/overview',
  cacheMiddleware(CACHE_TTL.STATIC),
  async (_req: Request, res: Response, next: NextFunction) => {
    const result = await destinationController.getTourismOverview();
    result.match(
      (data) => {
        res.json(successResponse(data, 'Tourism overview fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

/**
 * Yearly pilgrim arrivals at the Char Dham shrines and Hemkund Sahib.
 *
 * Cached hard: these are published annual totals and cannot change between requests. The
 * path says `pilgrim-arrivals` rather than `char-dham` because Hemkund Sahib is in the
 * figures and is not one of the four dhams — naming the endpoint for the dhams would make
 * the fifth row look like a mistake.
 */
tourismRouter.get(
  '/pilgrim-arrivals',
  cacheMiddleware(CACHE_TTL.STATIC),
  async (_req: Request, res: Response, next: NextFunction) => {
    const result = await destinationController.listPilgrimArrivals();
    result.match(
      (data) => {
        res.json(successResponse(data, 'Pilgrim arrivals fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

export default tourismRouter;
