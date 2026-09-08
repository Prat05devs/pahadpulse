import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';

import { CACHE_TTL } from '../config/constants.js';
import * as migrationController from '../controllers/migration.controller.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { validateRequest } from '../middleware/validate-request.middleware.js';
import { successResponse } from '../utils/response.js';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SCHEMA = {
  SLUG_PARAM: z.object({
    slug: z.string().min(1).max(128).regex(SLUG, 'slug must be a valid slug'),
  }),
};

const migrationRouter = Router();

/**
 * The state migration picture: every district's counts in both rounds.
 *
 * Cached hard. These are two published PDF reports; the figures cannot change between
 * requests, and will not change again until the commission publishes a third round.
 */
migrationRouter.get(
  '/',
  cacheMiddleware(CACHE_TTL.STATIC),
  async (_req: Request, res: Response, next: NextFunction) => {
    const result = await migrationController.listStateMigration();
    result.match(
      (data) => {
        res.json(successResponse(data, 'Migration surveys fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

const areaMigrationRouter = Router();

/**
 * One district's migration record.
 *
 * Returns 200 with `coverage: 'not_yet_available'` rather than 404 for a district with no
 * figures. The district exists and the question is answerable — the answer is that the
 * commission has not published for it — and a 404 would make the caller guess between that
 * and a bad slug. A slug that is not a district still 404s, from the area lookup.
 */
areaMigrationRouter.get(
  '/:slug/migration',
  cacheMiddleware(CACHE_TTL.STATIC),
  validateRequest({ params: SCHEMA.SLUG_PARAM }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.validated.params as z.infer<typeof SCHEMA.SLUG_PARAM>;
    const result = await migrationController.getAreaMigration(slug);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Area migration fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

export { areaMigrationRouter };
export default migrationRouter;
