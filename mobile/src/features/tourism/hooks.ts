import { useQuery } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/query-client';
import { fetchPilgrimArrivals, fetchTourismGuide } from './services';
import { tourismKeys } from './queries';

export function usePilgrimArrivals() {
  return useQuery({
    queryKey: tourismKeys.pilgrimArrivals(),
    queryFn: fetchPilgrimArrivals,
    staleTime: STALE_TIME.reference, // Annual data
  });
}

/** Curated and verified by hand; changes with a release, not by the hour. */
export function useTourismGuide() {
  return useQuery({
    queryKey: tourismKeys.guide(),
    queryFn: fetchTourismGuide,
    staleTime: STALE_TIME.reference,
  });
}
