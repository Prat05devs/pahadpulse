import type { RowDataPacket } from 'mysql2';

import type { AreaType, Division } from '../types/area.js';

export const AREAS_TABLE = 'areas';
export const AREA_BOUNDARIES_TABLE = 'area_boundaries';
export const MAP_LAYERS_TABLE = 'map_layers';

/** Raw `areas` row. Column names, not domain names. */
export interface AreaRow extends RowDataPacket {
  id: number;
  type: AreaType;
  code: string;
  slug: string;
  name_en: string;
  name_hi: string;
  parent_id: number | null;
  division: Division | null;
  headquarters_en: string | null;
  headquarters_hi: string | null;
  centroid_lat: string | null;
  centroid_lng: string | null;
  lgd_code: string | null;
  census_2011_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface AreaBoundaryRow extends RowDataPacket {
  area_id: number;
  geojson: unknown;
  simplified_geojson: unknown;
  is_placeholder: number;
  source_note: string;
  updated_at: string;
}

export interface MapLayerRow extends RowDataPacket {
  id: number;
  layer_key: string;
  owner_module: string;
  name_en: string;
  name_hi: string;
  display_order: number;
  is_default_visible: number;
  is_available: number;
}

/** Result of a bare `COUNT(*)` aggregate. */
export interface AreaCountRow extends RowDataPacket {
  total: number;
}

/** Row returned by the district list, which counts children in one query rather than N. */
export interface DistrictWithCountsRow extends AreaRow {
  tehsil_count: number;
  village_count: number;
  has_boundary: number;
}

/**
 * Both languages are always returned. The API does not negotiate language:
 * a bilingual client caches one payload and renders either locale.
 */
export interface LocalisedText {
  en: string;
  hi: string;
}

export interface Area {
  id: number;
  type: AreaType;
  code: string;
  slug: string;
  name: LocalisedText;
  parentId: number | null;
  division: Division | null;
  headquarters: LocalisedText | null;
  centroid: { lat: number; lng: number } | null;
  /** Official identifiers, NULL until confirmed and backfilled. See geography.md §9. */
  officialIds: { lgd: string | null; census2011: string | null };
}

export interface DistrictSummary extends Area {
  counts: { tehsils: number; villages: number };
  hasBoundary: boolean;
}

export interface AreaBoundary {
  areaId: number;
  geojson: unknown;
  /** TRUE while this is generated placeholder geometry rather than official boundary data. */
  isPlaceholder: boolean;
  sourceNote: string;
  updatedAt: string;
}

export interface MapLayer {
  key: string;
  ownerModule: string;
  name: LocalisedText;
  displayOrder: number;
  isDefaultVisible: boolean;
  isAvailable: boolean;
}
