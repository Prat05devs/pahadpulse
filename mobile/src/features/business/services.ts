import { z } from 'zod';
import { apiClient } from '@/lib/api';
import {
  BusinessScenarioSchema,
  BusinessSchemeDirectorySchema,
  ComparisonReportSchema,
} from './schemas';

export async function fetchScenarios() {
  return apiClient.get('/business/scenarios', z.array(BusinessScenarioSchema));
}

export async function compareDistricts(
  districtA: string,
  districtB: string,
  scenarioId: string
) {
  if (!districtA || !districtB || !scenarioId) return null;
  return apiClient.get(
    `/business/compare?districtA=${districtA}&districtB=${districtB}&scenarioId=${scenarioId}`,
    ComparisonReportSchema
  );
}

/**
 * The verified scheme directory - all of it. Seventy-odd records, so filtering happens on the
 * device and the search stays instant with a weak signal.
 */
export async function fetchBusinessSchemes() {
  return apiClient.get('/business/schemes', BusinessSchemeDirectorySchema);
}
