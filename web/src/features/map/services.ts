import { apiClient } from '@/lib/api';
import { AlertCollectionSchema, DistrictCollectionSchema } from './schemas';

/** The district layer: 13 simplified boundaries, one request. */
export async function fetchDistrictFeatures() {
  return apiClient.get('/map/districts', DistrictCollectionSchema);
}

/**
 * The active-alert layer.
 *
 * Only alerts that can actually be placed on the map come back here. Alerts whose source
 * describes the affected area only in prose are still live on the alerts page — the map is
 * a view of the data, never the definition of what counts as an alert.
 */
export async function fetchAlertFeatures() {
  return apiClient.get('/map/alerts', AlertCollectionSchema);
}
