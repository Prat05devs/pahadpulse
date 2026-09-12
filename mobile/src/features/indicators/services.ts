import { apiClient } from '@/lib/api';

import { AreaIndicatorsSchema, type AreaIndicators } from './schemas';

export function fetchAreaIndicators(
  slug: string,
  signal?: AbortSignal
): Promise<AreaIndicators> {
  return apiClient.get(`/areas/${slug}/indicators`, AreaIndicatorsSchema, { signal });
}
