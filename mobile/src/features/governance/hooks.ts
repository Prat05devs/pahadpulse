import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/query-client';

import { fetchDepartmentBudget, fetchDistrictStanding } from './services';

export const governanceKeys = {
  all: ['governance'] as const,
  budget: (year: string | undefined) =>
    [...governanceKeys.all, 'budget', year ?? 'latest'] as const,
  standing: () => [...governanceKeys.all, 'standing'] as const,
};

/** A budget is published once a year; switching years keeps the last one on screen. */
export function useDepartmentBudget(fiscalYear?: string) {
  return useQuery({
    queryKey: governanceKeys.budget(fiscalYear),
    queryFn: () => fetchDepartmentBudget(fiscalYear),
    staleTime: STALE_TIME.reference,
    placeholderData: keepPreviousData,
  });
}

export function useDistrictStanding() {
  return useQuery({
    queryKey: governanceKeys.standing(),
    queryFn: fetchDistrictStanding,
    staleTime: STALE_TIME.reference,
  });
}
