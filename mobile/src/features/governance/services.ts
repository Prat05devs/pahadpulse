import { apiClient, toQuery } from '@/lib/api';

import { BudgetReportSchema, DistrictStandingSchema } from './schemas';

export async function fetchDistrictStanding() {
  return apiClient.get('/governance/district-standing', DistrictStandingSchema);
}

export async function fetchDepartmentBudget(fiscalYear?: string) {
  return apiClient.get(
    `/governance/budget${toQuery({ year: fiscalYear })}`,
    BudgetReportSchema
  );
}
