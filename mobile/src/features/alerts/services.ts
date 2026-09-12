import { apiClient, toQuery } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/config/constants';

import {
  AlertListSchema,
  AlertSchema,
  AlertSummarySchema,
  type Alert,
  type AlertSummary,
} from './schemas';

export type AlertFilters = {
  type?: string;
  minSeverity?: string;
  areaSlug?: string;
};

export function fetchActiveAlerts(
  params: { cursor?: number; limit?: number; filters?: AlertFilters } = {},
  signal?: AbortSignal
): Promise<Alert[]> {
  const query = toQuery({
    cursor: params.cursor,
    limit: params.limit ?? DEFAULT_PAGE_SIZE,
    type: params.filters?.type,
    minSeverity: params.filters?.minSeverity,
    areaSlug: params.filters?.areaSlug,
  });
  return apiClient.get(`/alerts/active${query}`, AlertListSchema, { signal });
}

export function fetchAlertById(id: number, signal?: AbortSignal): Promise<Alert> {
  return apiClient.get(`/alerts/${id}`, AlertSchema, { signal });
}

export function fetchAreaAlerts(slug: string, signal?: AbortSignal): Promise<Alert[]> {
  const query = toQuery({ limit: DEFAULT_PAGE_SIZE });
  return apiClient.get(`/areas/${slug}/alerts${query}`, AlertListSchema, { signal });
}

export function fetchAlertSummary(signal?: AbortSignal): Promise<AlertSummary> {
  return apiClient.get('/alerts/summary', AlertSummarySchema, { signal });
}
