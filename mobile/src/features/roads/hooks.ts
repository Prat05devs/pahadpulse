import { useQuery } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/query-client';
import { fetchRoadNetwork } from './services';
import { roadsKeys } from './queries';

export function useRoadNetwork() {
  return useQuery({
    queryKey: roadsKeys.network(),
    queryFn: fetchRoadNetwork,
    staleTime: STALE_TIME.hourly,
  });
}
