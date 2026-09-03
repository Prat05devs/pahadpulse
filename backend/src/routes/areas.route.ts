import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';

import { CACHE_TTL } from '../config/constants.js';
import * as areaController from '../controllers/area.controller.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { validateRequest } from '../middleware/validate-request.middleware.js';
import { AreaType } from '../types/area.js';
import { successResponse } from '../utils/response.js';

const areaRouter = Router();

const SCHEMA = {
  SLUG_PARAM: z.object({
    slug: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase, hyphen separated'),
  }),
  CHILDREN_QUERY: z.object({
    type: z.enum([AreaType.Tehsil, AreaType.Village]).default(AreaType.Tehsil),
  }),
} as const;

/**
 * Specific paths are registered before parameterised ones (RT6), otherwise Express
 * matches `/:slug` first and `/districts` never resolves.
 */
areaRouter.get(
  '/districts',
  cacheMiddleware(CACHE_TTL.STATIC),
  async (_req: Request, res: Response, next: NextFunction) => {
    const result = await areaController.listDistricts();
    result.match(
      (data) => {
        res.json(successResponse(data, 'Districts fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

areaRouter.get(
  '/districts/:slug',
  cacheMiddleware(CACHE_TTL.STATIC),
  validateRequest({ params: SCHEMA.SLUG_PARAM }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.validated.params as z.infer<typeof SCHEMA.SLUG_PARAM>;
    const result = await areaController.getDistrictDetail(slug);
    result.match(
      (data) => {
        res.json(successResponse(data, 'District fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

areaRouter.get(
  '/:slug/boundary',
  cacheMiddleware(CACHE_TTL.STATIC),
  validateRequest({ params: SCHEMA.SLUG_PARAM }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.validated.params as z.infer<typeof SCHEMA.SLUG_PARAM>;
    const result = await areaController.getAreaBoundary(slug);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Boundary fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

areaRouter.get(
  '/:slug/children',
  cacheMiddleware(CACHE_TTL.STATIC),
  validateRequest({ params: SCHEMA.SLUG_PARAM, query: SCHEMA.CHILDREN_QUERY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.validated.params as z.infer<typeof SCHEMA.SLUG_PARAM>;
    const { type } = req.validated.query as z.infer<typeof SCHEMA.CHILDREN_QUERY>;
    const result = await areaController.listAreaChildren(slug, type);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Child areas fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

areaRouter.get(
  '/:slug',
  cacheMiddleware(CACHE_TTL.STATIC),
  validateRequest({ params: SCHEMA.SLUG_PARAM }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.validated.params as z.infer<typeof SCHEMA.SLUG_PARAM>;
    const result = await areaController.getAreaBySlug(slug);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Area fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

export default areaRouter;
