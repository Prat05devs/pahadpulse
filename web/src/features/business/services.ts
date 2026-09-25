import { z } from 'zod';
import { apiClient } from '@/lib/api';
import {
  BusinessScenarioSchema,
  ComparisonReportSchema,
  BusinessSchemeDirectorySchema,
} from './schemas';

export interface BusinessSchemeFilters {
  query?: string;
  sector?: string;
  support?: string;
  status?: string;
  limit?: number;
}

export async function fetchBusinessSchemes(filters: BusinessSchemeFilters = {}) {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.sector) params.set('sector', filters.sector);
  if (filters.support) params.set('support', filters.support);
  if (filters.status) params.set('status', filters.status);
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  const suffix = params.size > 0 ? `?${params.toString()}` : '';
  return apiClient.get(`/business/schemes${suffix}`, BusinessSchemeDirectorySchema);
}

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
