import { useQuery } from '@tanstack/react-query';

import { sourceKeys } from './queries';
import { fetchSources } from './services';

/**
 * The registry changes when a dataset is added or its terms are confirmed — a matter of
 * weeks, not minutes — so it is cached hard and refetched rarely.
 */
export function useSources() {
  return useQuery({
    queryKey: sourceKeys.list(),
    queryFn: ({ signal }) => fetchSources(signal),
    staleTime: 60 * 60 * 1000,
  });
}
