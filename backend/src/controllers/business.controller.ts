import type { NextFunction, Request, Response } from 'express';
import { BusinessService } from '../services/business.service.js';
import { successResponse } from '../utils/response.js';

const businessService = new BusinessService();

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
      String(scenarioId)
    );
    
    res.json(successResponse(report, 'Comparison report generated successfully'));
  } catch (error: any) {
    if (error.message === 'Scenario not found' || error.message === 'One or both districts not found') {
      res.status(404).json({ status: 'error', message: error.message });
      return;
    }
    next(error);
  }
}

