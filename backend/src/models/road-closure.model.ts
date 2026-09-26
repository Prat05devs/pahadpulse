import { toIsoUtc } from '../utils/datetime.js';

export const ROAD_CLOSURES_TABLE = 'road_closures';

export type RoadClosureStatus =
  'closed' | 'partially_closed' | 'partially_opened' | 'open' | 'unknown';

export interface RoadClosureRow {
  id: number;
  road_name: string;
  road_type: string | null;
  km_markers: string | null;
  department: string | null;
  division: string | null;
  area_slug: string | null;
  area_name_en: string | null;
  status: RoadClosureStatus;
  closed_at: string;
  expected_open_at: string | null;
  status_changed_at: string;
}

/** One closure as the public API serves it. Every time is ISO-8601 UTC. */
export interface RoadClosureOut {
  id: number;
  roadName: string;
  roadType: string | null;
  kmMarkers: string | null;
  department: string | null;
  division: string | null;
  district: { slug: string; name: string } | null;
  status: RoadClosureStatus;
  /** When PWD says the road closed. */
  closedAt: string;
  /** The division's own estimate — displayed as theirs, never as a promise (RD-7). */
  expectedOpenAt: string | null;
  /** True when that estimate is already in the past and the road is not open. */
  estimatePassed: boolean;
  /**
   * When Pahad Pulse first saw the current status. For a reopened road this is the honest
   * "reopened by" time: PWD publishes no reopening timestamp of its own.
   */
  statusSeenAt: string;
}

export function toRoadClosure(row: RoadClosureRow, now: Date): RoadClosureOut {
  const expectedOpenAt = toIsoUtc(row.expected_open_at);
  return {
    id: row.id,
    roadName: row.road_name,
    roadType: row.road_type,
    kmMarkers: row.km_markers,
    department: row.department,
    division: row.division,
    district:
      row.area_slug === null || row.area_name_en === null
        ? null
        : { slug: row.area_slug, name: row.area_name_en },
    status: row.status,
    closedAt: toIsoUtc(row.closed_at) ?? row.closed_at,
    expectedOpenAt,
    estimatePassed:
      row.status !== 'open' && expectedOpenAt !== null && new Date(expectedOpenAt) < now,
    statusSeenAt: toIsoUtc(row.status_changed_at) ?? row.status_changed_at,
  };
}
