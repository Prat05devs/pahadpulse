import { apiClient } from '@/lib/api';
import { RoadClosuresReportSchema, RoadNetworkSchema } from './schemas';

/**
 * The National and State Highways running through Uttarakhand.
 *
 * Says nothing about whether any road is open — that is `fetchRoadClosures`.
 */
export async function fetchRoadNetwork() {
  return apiClient.get('/roads', RoadNetworkSchema);
}

/**
 * Road closures as reported to PWD Uttarakhand, statewide or for one district.
 *
 * Revalidated every minute: the backend polls PWD every ten, and a reopened road must not be
 * held as "closed" by a long page cache.
 */
export async function fetchRoadClosures(district?: string) {
  const query = district === undefined ? '' : `?district=${encodeURIComponent(district)}`;
  return apiClient.get(`/roads/closures${query}`, RoadClosuresReportSchema, {
    next: { revalidate: 60 },
  });
}
