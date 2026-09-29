import { apiClient } from '@/lib/api';

import { AreaIndicatorsSchema, IndicatorListSchema, type AreaIndicators } from './schemas';

export function fetchAreaIndicators(
  slug: string,
  signal?: AbortSignal
): Promise<AreaIndicators> {
  return apiClient.get(`/areas/${slug}/indicators`, AreaIndicatorsSchema, { signal });
}

/** Every indicator the platform catalogues, with its sector and scope. */
export function fetchAllIndicators(signal?: AbortSignal) {
  return apiClient.get('/indicators', IndicatorListSchema, { signal });
}
