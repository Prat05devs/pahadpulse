import { useQuery } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/query-client';
import {
  fetchDestinations,
  fetchDestination,
  fetchCharDhamLoad,
  fetchPilgrimArrivals,
} from './services';
import { tourismKeys } from './queries';

export function useDestinations() {
  return useQuery({
    queryKey: tourismKeys.destinations(),
    queryFn: fetchDestinations,
    staleTime: STALE_TIME.hourly,
  });
}

export function useDestination(slug: string) {
  return useQuery({
    queryKey: tourismKeys.destination(slug),
    queryFn: () => fetchDestination(slug),
    staleTime: STALE_TIME.hourly,
  });
}

export function useCharDhamLoad() {
  return useQuery({
    queryKey: tourismKeys.charDhamLoad(),
    queryFn: fetchCharDhamLoad,
    staleTime: STALE_TIME.hourly,
  });
}

export function usePilgrimArrivals() {
  return useQuery({
    queryKey: tourismKeys.pilgrimArrivals(),
    queryFn: fetchPilgrimArrivals,
    staleTime: STALE_TIME.reference, // Annual data
  });
}
