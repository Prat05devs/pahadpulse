import type { Alert } from '@/features/alerts/schemas';
import { fetchActiveAlerts, fetchRecentAlerts } from '@/features/alerts/services';
import { fetchStateOverview } from '@/features/dashboard/services';
import type { StateOverview } from '@/features/dashboard/types';
import type { AlertCollection, DistrictCollection } from '@/features/map/schemas';
import { fetchAlertFeatures, fetchDistrictFeatures } from '@/features/map/services';

import type { BudgetReport, DistrictStanding } from './schemas';
import { fetchDepartmentBudget, fetchDistrictStanding } from './services';

export interface GovernanceWorkspaceData {
  standing: DistrictStanding | null;
  budget: BudgetReport | null;
  overview: StateOverview | null;
  alerts: Alert[] | null;
  recentAlerts: Alert[] | null;
  districtFeatures: DistrictCollection | null;
  alertFeatures: AlertCollection | null;
}

/**
 * Loads each independent dashboard surface without making one upstream failure fatal to the
 * rest of the workspace. A missing alerts feed must not hide the annual budget, and a missing
 * map must not erase district evidence.
 */
export async function loadGovernanceWorkspace(fiscalYear?: string): Promise<GovernanceWorkspaceData> {
  const [standing, budget, overview, alerts, recentAlerts, districtFeatures, alertFeatures] =
    await Promise.allSettled([
      fetchDistrictStanding(),
      fetchDepartmentBudget(fiscalYear),
      fetchStateOverview(),
      fetchActiveAlerts(undefined, 20),
      fetchRecentAlerts(48, 10),
      fetchDistrictFeatures(),
      fetchAlertFeatures(),
    ]);

  return {
    standing: standing.status === 'fulfilled' ? standing.value : null,
    budget: budget.status === 'fulfilled' ? budget.value : null,
    overview: overview.status === 'fulfilled' ? overview.value : null,
    alerts: alerts.status === 'fulfilled' ? alerts.value : null,
    recentAlerts: recentAlerts.status === 'fulfilled' ? recentAlerts.value : null,
    districtFeatures: districtFeatures.status === 'fulfilled' ? districtFeatures.value : null,
    alertFeatures: alertFeatures.status === 'fulfilled' ? alertFeatures.value : null,
  };
}
