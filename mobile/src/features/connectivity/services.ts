import { apiClient } from '@/lib/api';
import { DistrictNetworkSchema, StateNetworkSchema } from './schemas';

/** Measured internet performance for every district, latest quarter. */
export async function fetchStateNetwork() {
  return apiClient.get('/connectivity', StateNetworkSchema);
}

/** One district's measurements, newest quarter first. */
export async function fetchAreaNetwork(slug: string) {
  return apiClient.get(`/areas/${slug}/connectivity`, DistrictNetworkSchema);
}
