import { apiClient } from '@/lib/api';

import {
  AlertCollectionSchema,
  DistrictCollectionSchema,
  FireCollectionSchema,
  type AlertCollection,
  type DistrictCollection,
  type FireCollection,
} from './schemas';

/** The district layer: 13 simplified boundaries, one request. */
export function fetchDistrictFeatures(signal?: AbortSignal): Promise<DistrictCollection> {
  return apiClient.get('/map/districts', DistrictCollectionSchema, { signal });
}

/**
 * The active-alert layer.
 *
 * Only alerts that can actually be placed on the map come back here. Alerts whose source
 * describes the affected area only in prose are still live on the alerts tab - the map is a
 * view of the data, never the definition of what counts as an alert.
 */
export function fetchAlertFeatures(signal?: AbortSignal): Promise<AlertCollection> {
  return apiClient.get('/map/alerts', AlertCollectionSchema, { signal });
}

/** NASA FIRMS fire detections from the last 48 hours, already limited to the state. */
export function fetchFireFeatures(signal?: AbortSignal): Promise<FireCollection> {
  return apiClient.get('/map/fires', FireCollectionSchema, { signal });
}
