import { useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/query-client';

import { weatherKeys } from './queries';
import { fetchAreaWeather } from './services';

/**
 * Weather for one district.
 *
 * `hourly` staleness because that is how often the upstream observation actually changes;
 * refetching every minute would just return the same reading with a newer `fetchedAt`.
 */
export function useAreaWeather(slug: string) {
  return useQuery({
    queryKey: weatherKeys.byArea(slug),
    queryFn: ({ signal }) => fetchAreaWeather(slug, signal),
    staleTime: STALE_TIME.hourly,
    enabled: slug.length > 0,
  });
}
