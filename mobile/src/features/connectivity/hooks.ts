import { useQuery } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/query-client';
import { fetchStateNetwork, fetchAreaNetwork } from './services';
import { connectivityKeys } from './queries';

export function useStateNetwork() {
  return useQuery({
    queryKey: connectivityKeys.state(),
    queryFn: fetchStateNetwork,
    staleTime: STALE_TIME.hourly,
  });
}

export function useAreaNetwork(slug: string) {
  return useQuery({
    queryKey: connectivityKeys.area(slug),
    queryFn: () => fetchAreaNetwork(slug),
    staleTime: STALE_TIME.hourly,
  });
}
