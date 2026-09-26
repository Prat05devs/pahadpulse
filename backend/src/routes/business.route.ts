import { Router } from 'express';
import * as businessController from '../controllers/business.controller.js';
import { CACHE_TTL_INDICATORS } from '../config/constants.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';

const businessRouter = Router();

businessRouter.get(
  '/scenarios',
  cacheMiddleware(CACHE_TTL_INDICATORS),
  businessController.getScenarios,
);
businessRouter.get(
  '/schemes',
  cacheMiddleware(CACHE_TTL_INDICATORS),
  businessController.getSchemes,
);
businessRouter.get(
  '/compare',
  cacheMiddleware(CACHE_TTL_INDICATORS),
  businessController.compareDistricts,
);

export default businessRouter;
