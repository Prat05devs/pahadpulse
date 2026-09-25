import type { NextFunction, Request, Response } from 'express';
import { BusinessService } from '../services/business.service.js';
import { successResponse } from '../utils/response.js';
import { z } from 'zod';
import { listBusinessSchemes } from '../services/business-scheme.service.js';

const businessService = new BusinessService();

const SchemeQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  sector: z.string().trim().max(80).optional(),
  support: z.string().trim().max(80).optional(),
  status: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(69),
});

export async function getSchemes(req: Request, res: Response, next: NextFunction) {
  try {
    const query = SchemeQuerySchema.parse(req.query);
    const result = listBusinessSchemes({
      ...(query.q === undefined ? {} : { query: query.q }),
      ...(query.sector === undefined ? {} : { sector: query.sector }),
      ...(query.support === undefined ? {} : { support: query.support }),
      ...(query.status === undefined ? {} : { status: query.status }),
      limit: query.limit,
    });
    res.json(successResponse(result, 'Verified business support schemes retrieved successfully'));
  } catch (error) {
    next(error);
  }
}

export async function getScenarios(_req: Request, res: Response, next: NextFunction) {
  try {
    const scenarios = await businessService.getScenarios();
    res.json(successResponse(scenarios, 'Business scenarios retrieved successfully'));
  } catch (error) {
    next(error);
  }
}

export async function compareDistricts(req: Request, res: Response, next: NextFunction) {
  try {
    const { districtA, districtB, scenarioId } = req.query;

    if (!districtA || !districtB || !scenarioId) {
      res.status(400).json({ status: 'error', message: 'Missing required query parameters' });
      return;
    }

    const report = await businessService.compareDistricts(
      String(districtA),
      String(districtB),
      String(scenarioId),
    );

    res.json(successResponse(report, 'Comparison report generated successfully'));
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === 'Scenario not found' ||
        error.message === 'One or both districts not found')
    ) {
      res.status(404).json({ status: 'error', message: error.message });
      return;
    }
    next(error);
  }
}
