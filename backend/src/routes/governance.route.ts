import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';

import { CACHE_TTL_INDICATORS } from '../config/constants.js';
import * as governanceController from '../controllers/governance.controller.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { validateRequest } from '../middleware/validate-request.middleware.js';
import { successResponse } from '../utils/response.js';

/**
 * The governance workspace's reads.
 *
 * Every figure here is already public — a budget laid before the Legislative Assembly, and
 * indicators this API serves elsewhere. The workspace's value is the arrangement, not
 * privileged access, which is why these endpoints carry no auth: `accounts` is deferred, and
 * a login that protects public data would be theatre.
 */
const SCHEMA = {
  BUDGET_QUERY: z.object({
    // `2026-27`, as the state writes it.
    year: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'expected a fiscal year such as 2026-27')
      .optional(),
  }),
} as const;

const governanceRouter = Router();

governanceRouter.get(
  '/budget',
  cacheMiddleware(CACHE_TTL_INDICATORS),
  validateRequest({ query: SCHEMA.BUDGET_QUERY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { year } = req.validated.query as z.infer<typeof SCHEMA.BUDGET_QUERY>;

    // Default to the latest year held rather than a hardcoded one, so next year's budget
    // appears by being inserted.
    let fiscalYear = year;
    if (fiscalYear === undefined) {
      const years = await governanceController.listBudgetYears();
      if (years.isErr()) {
        next(years.error);
        return;
      }
      fiscalYear = years.value[0];
    }
    if (fiscalYear === undefined) {
      res.json(
        successResponse(
          {
            fiscalYear: null,
            total: 0,
            departmentTotal: 0,
            summary: null,
            history: [],
            availableYears: [],
            departments: [],
          },
          'No budget has been transcribed yet',
        ),
      );
      return;
    }

    const result = await governanceController.getBudget(fiscalYear);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Budget data fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

governanceRouter.get(
  '/district-standing',
  cacheMiddleware(CACHE_TTL_INDICATORS),
  async (_req: Request, res: Response, next: NextFunction) => {
    const result = await governanceController.getDistrictStanding();
    result.match(
      (data) => {
        res.json(successResponse(data, 'District standing fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

export default governanceRouter;
