import { fetchStateOverview } from '@/features/dashboard/services';
import type { StateOverview } from '@/features/dashboard/types';
import type { BudgetReport, DistrictStanding } from '@/features/governance/schemas';
import { fetchDepartmentBudget, fetchDistrictStanding } from '@/features/governance/services';
import type { Indicator } from '@/features/indicators/schemas';
import { fetchAllIndicators } from '@/features/indicators/services';

export interface IntelligenceWorkspaceData {
  catalogue: Indicator[] | null;
  standing: DistrictStanding | null;
  budget: BudgetReport | null;
  overview: StateOverview | null;
}

/** Loads the four evidence sets independently so partial data can still be explored. */
export async function loadIntelligenceWorkspace(): Promise<IntelligenceWorkspaceData> {
  const [catalogue, standing, budget, overview] = await Promise.allSettled([
    fetchAllIndicators(),
    fetchDistrictStanding(),
    fetchDepartmentBudget(),
    fetchStateOverview(),
  ]);

  return {
    catalogue: catalogue.status === 'fulfilled' ? catalogue.value : null,
    standing: standing.status === 'fulfilled' ? standing.value : null,
    budget: budget.status === 'fulfilled' ? budget.value : null,
    overview: overview.status === 'fulfilled' ? overview.value : null,
  };
}
