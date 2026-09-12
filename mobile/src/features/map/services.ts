import { apiClient } from '@/lib/api';

import {
  AlertCollectionSchema,
  DistrictCollectionSchema,
  MigrationSummarySchema,
  type AlertCollection,
  type DistrictCollection,
  type MigrationSummary,
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

/**
 * Migration figures for every district, for the choropleth.
 *
 * One request for all thirteen rather than `/areas/:slug/migration` thirteen times — the
 * map needs the whole state before it can colour any of it.
 */
export function fetchMigrationSummary(signal?: AbortSignal): Promise<MigrationSummary> {
  return apiClient.get('/migration', MigrationSummarySchema, { signal });
}
