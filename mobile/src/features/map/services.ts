import { apiClient } from '@/lib/api';

import {
  AlertCollectionSchema,
  DistrictCollectionSchema,
  type AlertCollection,
  type DistrictCollection,
} from './schemas';

/** The district layer: 13 simplified boundaries, one request. */
export function fetchDistrictFeatures(signal?: AbortSignal): Promise<DistrictCollection> {
  return apiClient.get('/map/districts', DistrictCollectionSchema, { signal });
}

/**
 * The active-alert layer.
 *
 * Only alerts that can actually be placed on the map come back here. Alerts whose source
 * describes the affected area only in prose are still live on the alerts tab — the map is a
 * view of the data, never the definition of what counts as an alert.
 */
export function fetchAlertFeatures(signal?: AbortSignal): Promise<AlertCollection> {
  return apiClient.get('/map/alerts', AlertCollectionSchema, { signal });
}
