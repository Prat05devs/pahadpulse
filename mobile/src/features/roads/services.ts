import { apiClient, toQuery } from '@/lib/api';
import { RoadClosuresReportSchema, RoadNetworkSchema } from './schemas';

/**
 * The National and State Highways running through Uttarakhand.
 *
 * Says nothing about whether any road is open - that is `fetchRoadClosures`.
 */
export async function fetchRoadNetwork() {
  return apiClient.get('/roads', RoadNetworkSchema);
}

/** Road closures as reported to PWD Uttarakhand, statewide or for one district. */
export async function fetchRoadClosures(district?: string, signal?: AbortSignal) {
  return apiClient.get(`/roads/closures${toQuery({ district })}`, RoadClosuresReportSchema, {
    signal,
  });
}
