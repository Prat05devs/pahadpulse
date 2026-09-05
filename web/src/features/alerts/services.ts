import { apiClient } from '@/lib/api';
import { ActiveAlertsSchema, AlertSchema, AlertSummarySchema } from './schemas';

export async function fetchActiveAlerts(
  cursor?: number,
  limit: number = 20,
  filters?: {
    type?: string;
    minSeverity?: string;
    areaSlug?: string;
  }
) {
  const params = new URLSearchParams();
  if (cursor) params.append('cursor', cursor.toString());
  params.append('limit', limit.toString());
  if (filters?.type) params.append('type', filters.type);
  if (filters?.minSeverity) params.append('minSeverity', filters.minSeverity);
  if (filters?.areaSlug) params.append('areaSlug', filters.areaSlug);

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiClient.get(`/alerts/active${query}`, ActiveAlertsSchema);
}

export async function fetchAlertById(id: number) {
  return apiClient.get(`/alerts/${id}`, AlertSchema);
}

export async function fetchAreaAlerts(slug: string, cursor?: number, limit: number = 20) {
  const params = new URLSearchParams();
  if (cursor) params.append('cursor', cursor.toString());
  params.append('limit', limit.toString());

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiClient.get(`/areas/${slug}/alerts${query}`, ActiveAlertsSchema);
}

export async function fetchAlertSummary() {
  return apiClient.get('/alerts/summary', AlertSummarySchema);
}
