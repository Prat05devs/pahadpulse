import { apiClient } from '@/lib/api';
import { RecentSeismicSchema, type RecentSeismic } from './schemas';

export async function fetchRecentSeismic(limit = 20): Promise<RecentSeismic> {
  return apiClient.get(`/seismic/recent?limit=${limit}`, RecentSeismicSchema);
}
