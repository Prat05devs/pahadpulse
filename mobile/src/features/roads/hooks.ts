import { useQuery } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/query-client';
import { fetchRoadClosures, fetchRoadNetwork } from './services';
import { roadsKeys } from './queries';

export function useRoadNetwork() {
  return useQuery({
    queryKey: roadsKeys.network(),
    queryFn: fetchRoadNetwork,
    staleTime: STALE_TIME.hourly,
  });
}

/**
 * PWD closures. Live data: the backend polls PWD every ten minutes, and a reopened road must
 * not be held as "closed" by a long cache.
 */
export function useRoadClosures(district?: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    enabled: options.enabled ?? true,
    queryKey: roadsKeys.closures(district),
    queryFn: ({ signal }) => fetchRoadClosures(district, signal),
    staleTime: STALE_TIME.live,
  });
}
