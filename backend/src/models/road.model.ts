import type { Provenance } from './source.model.js';

export const ROAD_ROUTES_TABLE = 'road_routes';

export type RoadNetwork = 'NH' | 'SH';

export interface RoadRouteRow {
  id: number;
  ref: string;
  network: RoadNetwork;
  route_number: string;
  segment_count: number;
  min_lat: string | null;
  min_lng: string | null;
  max_lat: string | null;
  max_lng: string | null;
  source_id: number;
  vintage: string;
  fetched_at: string;
}

export interface RoadRoute {
  id: number;
  ref: string;
  network: RoadNetwork;
  routeNumber: string;
  segmentCount: number;
  /** [west, south, east, north], or null when the upstream gave no bounds. */
  bounds: [number, number, number, number] | null;
  sourceId: number;
  vintage: string;
  fetchedAt: string;
}

export type RoadRouteOut = RoadRoute & { provenance: Provenance | null };

export function toRoadRoute(row: RoadRouteRow): RoadRoute {
  return {
    id: row.id,
    ref: row.ref,
    network: row.network,
    routeNumber: row.route_number,
    segmentCount: row.segment_count,
    bounds:
      row.min_lat !== null && row.min_lng !== null && row.max_lat !== null && row.max_lng !== null
        ? [Number(row.min_lng), Number(row.min_lat), Number(row.max_lng), Number(row.max_lat)]
        : null,
    sourceId: row.source_id,
    vintage: row.vintage,
    fetchedAt: row.fetched_at,
  };
}
