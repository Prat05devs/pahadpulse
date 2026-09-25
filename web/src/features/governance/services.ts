import { apiClient } from '@/lib/api';

import { BudgetReportSchema, DistrictStandingSchema } from './schemas';

export async function fetchDistrictStanding() {
  return apiClient.get('/governance/district-standing', DistrictStandingSchema);
}

export async function fetchDepartmentBudget(fiscalYear?: string) {
  const query = fiscalYear === undefined ? '' : `?year=${encodeURIComponent(fiscalYear)}`;
  return apiClient.get(`/governance/budget${query}`, BudgetReportSchema);
}
