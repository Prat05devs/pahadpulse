import { type NextFunction, type Request, type Response, Router } from 'express';

import { CACHE_TTL } from '../config/constants.js';
import * as projectController from '../controllers/project.controller.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { successResponse } from '../utils/response.js';

const projectRouter = Router();

/**
 * The development register — what is being built across the state.
 *
 * Cached hard. These rows change when a human edits them, which is monthly at most, and
 * never between requests. This endpoint deliberately makes no claim about how a project is
 * PROGRESSING beyond the status recorded against it: there is no feed behind these, so a
 * status is only as current as the `verifiedOn` date served alongside it.
 */
projectRouter.get(
  '/',
  cacheMiddleware(CACHE_TTL.STATIC),
  async (_req: Request, res: Response, next: NextFunction) => {
    const result = await projectController.listProjects();
    result.match(
      (data) => {
        res.json(successResponse(data, 'Development projects fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

export default projectRouter;
