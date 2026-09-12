import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { BusinessScenarioSchema, ComparisonReportSchema } from './schemas';

export async function fetchScenarios() {
  return apiClient.get('/business/scenarios', z.array(BusinessScenarioSchema));
}

export async function compareDistricts(districtA: string, districtB: string, scenarioId: string) {
  if (!districtA || !districtB || !scenarioId) return null;
  return apiClient.get(
    `/business/compare?districtA=${districtA}&districtB=${districtB}&scenarioId=${scenarioId}`,
    ComparisonReportSchema
  );
}

