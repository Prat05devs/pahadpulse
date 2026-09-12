import { useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/query-client';

import { mapKeys } from './queries';
import { fetchAlertFeatures, fetchDistrictFeatures, fetchMigrationSummary } from './services';

/**
 * District boundaries.
 *
 * Reference data: a district boundary changing is a government act, not a user action, and
 * the API caches it hard for the same reason. This is also the single largest payload the
 * app fetches (~100 KB of GeoJSON), which is another reason not to refetch it on a timer.
 */
export function useDistrictFeatures() {
  return useQuery({
    queryKey: mapKeys.districts(),
    queryFn: ({ signal }) => fetchDistrictFeatures(signal),
    staleTime: STALE_TIME.reference,
  });
}

/** Active alerts, on the same cadence the alerts tab uses — they expire in hours. */
export function useAlertFeatures() {
  return useQuery({
    queryKey: mapKeys.alerts(),
    queryFn: ({ signal }) => fetchAlertFeatures(signal),
    staleTime: STALE_TIME.live,
  });
}

/**
 * Migration figures, for the out-migration choropleth.
 *
 * Reference data: these come from two commission surveys, published years apart. Nothing
 * about them changes between app launches.
 */
export function useMigrationSummary() {
  return useQuery({
    queryKey: mapKeys.migration(),
    queryFn: ({ signal }) => fetchMigrationSummary(signal),
    staleTime: STALE_TIME.reference,
  });
}
