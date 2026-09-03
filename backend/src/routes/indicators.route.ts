import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';

import {
  CACHE_TTL_INDICATOR_SERIES,
  CACHE_TTL_INDICATORS,
  PAGINATION,
} from '../config/constants.js';
import * as indicatorController from '../controllers/indicator.controller.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { validateRequest } from '../middleware/validate-request.middleware.js';
import { IndicatorCategory } from '../types/indicator.js';
import { successResponse } from '../utils/response.js';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INDICATOR_KEY = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

const SCHEMA = {
  CATEGORY_QUERY: z.object({
    category: z.enum(IndicatorCategory).optional(),
  }),
  KEY_PARAM: z.object({
    key: z.string().min(1).max(64).regex(INDICATOR_KEY, 'Indicator key must be snake_case'),
  }),
  SLUG_PARAM: z.object({
    slug: z.string().min(1).max(128).regex(SLUG, 'slug must be a valid slug'),
  }),
  COMPARE_QUERY: z
    .object({
      areas: z
        .string()
        .min(1)
        .transform((value) => value.split(',').map((slug) => slug.trim())),
      categories: z
        .string()
        .optional()
        .transform((value) => value?.split(',').map((c) => c.trim())),
    })
    .refine((q) => q.areas.length === 2, {
      message: 'areas must contain exactly two comma-separated slugs',
      path: ['areas'],
    })
    .refine((q) => q.areas.every((slug) => SLUG.test(slug)), {
      message: 'each area must be a valid slug',
      path: ['areas'],
    }),
  SERIES_QUERY: z.object({
    areaSlug: z.string().min(1).max(128).regex(SLUG, 'areaSlug must be a valid slug'),
  }),
  RANKING_QUERY: z.object({
    vintage: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'vintage must be YYYY-MM-DD')
      .optional(),
    cursor: z.coerce.number().int().min(0).default(0),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(PAGINATION.MAX_LIMIT)
      .default(PAGINATION.DEFAULT_LIMIT),
  }),
} as const;

const indicatorRouter = Router();

indicatorRouter.get(
  '/',
  cacheMiddleware(CACHE_TTL_INDICATORS),
  validateRequest({ query: SCHEMA.CATEGORY_QUERY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { category } = req.validated.query as z.infer<typeof SCHEMA.CATEGORY_QUERY>;
    const result = await indicatorController.listIndicators(category);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Indicators fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

// Registered before /:key/* — RT6: a specific path before a parameterised one.
indicatorRouter.get(
  '/compare',
  cacheMiddleware(CACHE_TTL_INDICATORS),
  validateRequest({ query: SCHEMA.COMPARE_QUERY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { areas, categories } = req.validated.query as z.infer<typeof SCHEMA.COMPARE_QUERY>;
    const [slugA, slugB] = areas as [string, string];
    const result = await indicatorController.compareAreas(slugA, slugB, categories);
    result.match(
      (data) => {
        res.json(
          successResponse(
            { rows: data.rows, omittedCount: data.omittedCount },
            'Comparison fetched successfully',
          ),
        );
      },
      (error) => {
        next(error);
      },
    );
  },
);

indicatorRouter.get(
  '/:key/series',
  cacheMiddleware(CACHE_TTL_INDICATOR_SERIES),
  validateRequest({ params: SCHEMA.KEY_PARAM, query: SCHEMA.SERIES_QUERY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { key } = req.validated.params as z.infer<typeof SCHEMA.KEY_PARAM>;
    const { areaSlug } = req.validated.query as z.infer<typeof SCHEMA.SERIES_QUERY>;
    const result = await indicatorController.getSeries(key, areaSlug);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Series fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

indicatorRouter.get(
  '/:key/ranking',
  cacheMiddleware(CACHE_TTL_INDICATOR_SERIES),
  validateRequest({ params: SCHEMA.KEY_PARAM, query: SCHEMA.RANKING_QUERY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { key } = req.validated.params as z.infer<typeof SCHEMA.KEY_PARAM>;
    const { vintage, cursor, limit } = req.validated.query as z.infer<typeof SCHEMA.RANKING_QUERY>;
    const result = await indicatorController.getRanking(key, vintage, cursor, limit);
    result.match(
      (data) => {
        res.json({
          success: true as const,
          message: 'Ranking fetched successfully',
          data: { indicator: data.indicator, vintage: data.vintage, entries: data.data },
          pagination: data.pagination,
          timestamp: new Date().toISOString(),
        });
      },
      (error) => {
        next(error);
      },
    );
  },
);

export default indicatorRouter;

// --- /api/areas/:slug/indicators — mounted separately under the `/areas` prefix so the
// geography module's route file (areas.route.ts) never has to know indicators exists.

const areaIndicatorsRouter = Router();

areaIndicatorsRouter.get(
  '/:slug/indicators',
  cacheMiddleware(CACHE_TTL_INDICATORS),
  validateRequest({ params: SCHEMA.SLUG_PARAM }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.validated.params as z.infer<typeof SCHEMA.SLUG_PARAM>;
    const result = await indicatorController.getAreaIndicators(slug);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Area indicators fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

export { areaIndicatorsRouter };
