import { useQuery } from '@tanstack/react-query';
import { fetchScenarios, compareDistricts } from './services';

export const businessKeys = {
  all: ['business'] as const,
  scenarios: () => [...businessKeys.all, 'scenarios'] as const,
  compare: (a: string, b: string, scenarioId: string) =>
    [...businessKeys.all, 'compare', a, b, scenarioId] as const,
};

export function useBusinessScenarios() {
  return useQuery({
    queryKey: businessKeys.scenarios(),
    queryFn: fetchScenarios,
    staleTime: 60 * 60 * 1000,
  });
}

export function useBusinessComparison(districtA: string, districtB: string, scenarioId: string) {
  return useQuery({
    queryKey: businessKeys.compare(districtA, districtB, scenarioId),
    queryFn: () => compareDistricts(districtA, districtB, scenarioId),
    enabled: Boolean(districtA && districtB && scenarioId),
    staleTime: 60 * 60 * 1000,
  });
}
