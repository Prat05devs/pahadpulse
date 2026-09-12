import { useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/query-client';

import { alertKeys } from './queries';
import {
  fetchActiveAlerts,
  fetchAlertById,
  fetchAlertSummary,
  fetchAreaAlerts,
  type AlertFilters,
} from './services';

/**
 * Alerts are safety information, so every hook here uses the `live` staleness window.
 *
 * A cached weather warning that has since been cancelled is worse than no warning at all,
 * which is why this is the one feature that refetches aggressively rather than trusting the
 * offline cache.
 */

export function useActiveAlerts(filters?: AlertFilters) {
  return useQuery({
    queryKey: alertKeys.active(filters),
    queryFn: ({ signal }) => fetchActiveAlerts({ filters }, signal),
    staleTime: STALE_TIME.live,
  });
}

export function useAlertSummary() {
  return useQuery({
    queryKey: alertKeys.summary(),
    queryFn: ({ signal }) => fetchAlertSummary(signal),
    staleTime: STALE_TIME.live,
  });
}

export function useAlert(id: number) {
  return useQuery({
    queryKey: alertKeys.detail(id),
    queryFn: ({ signal }) => fetchAlertById(id, signal),
    staleTime: STALE_TIME.live,
    enabled: Number.isFinite(id),
  });
}

export function useAreaAlerts(slug: string) {
  return useQuery({
    queryKey: alertKeys.byArea(slug),
    queryFn: ({ signal }) => fetchAreaAlerts(slug, signal),
    staleTime: STALE_TIME.live,
    enabled: slug.length > 0,
  });
}
