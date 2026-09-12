import { apiClient } from '@/lib/api';
import { RoadNetworkSchema } from './schemas';

/**
 * The National and State Highways running through Uttarakhand.
 *
 * Says nothing about whether any road is open — closures are a separate, manually reported
 * dataset that has no upstream feed yet.
 */
export async function fetchRoadNetwork() {
  return apiClient.get('/roads', RoadNetworkSchema);
}
