import { apiClient } from '@/lib/api';

import {
  DistrictDetailSchema,
  DistrictSummaryListSchema,
  type DistrictDetail,
  type DistrictSummary,
} from './schemas';

/**
 * One function per endpoint. No caching, no React — a service is a plain async call that
 * either resolves with validated data or throws an `ApiError`.
 *
 * Keeping them free of hooks is what lets the same file be copied to the web app, and lets
 * a test call the API layer without rendering anything.
 */

export function fetchDistricts(signal?: AbortSignal): Promise<DistrictSummary[]> {
  return apiClient.get('/areas/districts', DistrictSummaryListSchema, { signal });
}

export function fetchDistrictDetail(
  slug: string,
  signal?: AbortSignal
): Promise<DistrictDetail> {
  return apiClient.get(`/areas/districts/${slug}`, DistrictDetailSchema, { signal });
}
