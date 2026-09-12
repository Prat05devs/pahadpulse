import { useQuery } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/query-client';
import { fetchRecentSeismic } from './services';
import { seismicKeys } from './queries';

export function useRecentSeismic() {
  return useQuery({
    queryKey: seismicKeys.recent(),
    queryFn: () => fetchRecentSeismic(),
    staleTime: STALE_TIME.hourly,
  });
}
