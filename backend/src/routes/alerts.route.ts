import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';

import { CACHE_TTL_ALERTS, PAGINATION, RECENT_ALERTS } from '../config/constants.js';
import * as alertController from '../controllers/alert.controller.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { validateRequest } from '../middleware/validate-request.middleware.js';
import { AlertSeverity, AlertType } from '../types/alert.js';
import { successResponse } from '../utils/response.js';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SCHEMA = {
  ID_PARAM: z.object({ id: z.coerce.number().int().positive() }),
  SLUG_PARAM: z.object({
    slug: z.string().min(1).max(128).regex(SLUG, 'slug must be a valid slug'),
  }),
  ACTIVE_QUERY: z.object({
    type: z.enum(AlertType).optional(),
    minSeverity: z.enum(AlertSeverity).optional(),
    cursor: z.coerce.number().int().positive().default(Number.MAX_SAFE_INTEGER),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(PAGINATION.MAX_LIMIT)
      .default(PAGINATION.DEFAULT_LIMIT),
  }),
  RECENT_QUERY: z.object({
    hours: z.coerce
      .number()
      .int()
      .min(1)
      .max(RECENT_ALERTS.MAX_WINDOW_HOURS)
      .default(RECENT_ALERTS.DEFAULT_WINDOW_HOURS),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(PAGINATION.MAX_LIMIT)
      .default(PAGINATION.DEFAULT_LIMIT),
  }),
  AREA_ALERTS_QUERY: z.object({
    cursor: z.coerce.number().int().positive().default(Number.MAX_SAFE_INTEGER),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(PAGINATION.MAX_LIMIT)
      .default(PAGINATION.DEFAULT_LIMIT),
  }),
} as const;

const alertRouter = Router();

// Specific paths registered before /:id — RT6.
alertRouter.get(
  '/active',
  cacheMiddleware(CACHE_TTL_ALERTS),
  validateRequest({ query: SCHEMA.ACTIVE_QUERY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { type, minSeverity, cursor, limit } = req.validated.query as z.infer<
      typeof SCHEMA.ACTIVE_QUERY
    >;
    const result = await alertController.listActive({
      cursor,
      limit,
      ...(type !== undefined && { type }),
      ...(minSeverity !== undefined && { minSeverity }),
    });
    result.match(
      (data) => {
        res.json(successResponse(data, 'Active alerts fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

/**
 * Warnings that have already lapsed, for the "recently expired" section of the alerts page.
 * Separate from `/active` rather than a flag on it: nothing that reads this endpoint may
 * ever mistake its contents for warnings in force.
 */
alertRouter.get(
  '/recent',
  cacheMiddleware(CACHE_TTL_ALERTS),
  validateRequest({ query: SCHEMA.RECENT_QUERY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { hours, limit } = req.validated.query as z.infer<typeof SCHEMA.RECENT_QUERY>;
    const result = await alertController.listRecent(hours, limit);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Recent alerts fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

alertRouter.get(
  '/summary',
  cacheMiddleware(CACHE_TTL_ALERTS),
  async (_req: Request, res: Response, next: NextFunction) => {
    const result = await alertController.getSummary();
    result.match(
      (data) => {
        res.json(successResponse(data, 'Alert summary fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

alertRouter.get(
  '/:id',
  cacheMiddleware(CACHE_TTL_ALERTS),
  validateRequest({ params: SCHEMA.ID_PARAM }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.validated.params as z.infer<typeof SCHEMA.ID_PARAM>;
    const result = await alertController.getById(id);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Alert fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

export default alertRouter;

// --- /api/areas/:slug/alerts — mounted separately under `/areas`, same reasoning as
// indicators.route.ts's areaIndicatorsRouter: geography's own route file stays untouched.

const areaAlertsRouter = Router();

areaAlertsRouter.get(
  '/:slug/alerts',
  cacheMiddleware(CACHE_TTL_ALERTS),
  validateRequest({ params: SCHEMA.SLUG_PARAM, query: SCHEMA.AREA_ALERTS_QUERY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.validated.params as z.infer<typeof SCHEMA.SLUG_PARAM>;
    const { cursor, limit } = req.validated.query as z.infer<typeof SCHEMA.AREA_ALERTS_QUERY>;
    const result = await alertController.listActiveForArea(slug, cursor, limit);
    result.match(
      (data) => {
        res.json(successResponse(data, 'District alerts fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

export { areaAlertsRouter };
