import { useQuery } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/query-client';
import { fetchPilgrimArrivals } from './services';
import { tourismKeys } from './queries';

export function usePilgrimArrivals() {
  return useQuery({
    queryKey: tourismKeys.pilgrimArrivals(),
    queryFn: fetchPilgrimArrivals,
    staleTime: STALE_TIME.reference, // Annual data
  });
}
