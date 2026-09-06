import { toIsoUtc } from '../utils/datetime.js';

export const SEISMIC_EVENTS_TABLE = 'seismic_events';

export interface SeismicEventRow {
  id: number;
  source_id: number;
  source_event_id: string;
  magnitude: string;
  magnitude_type: string | null;
  depth_km: string | null;
  place: string;
  lat: string;
  lng: string;
  occurred_at: string;
  review_status: string | null;
  web_url: string | null;
  fetched_at: string;
}

/**
 * Felt-effect bands, from magnitude alone.
 *
 * NOT a damage or hazard assessment. Actual shaking at a place depends on depth, distance,
 * local geology and building stock, none of which this record knows — so these describe the
 * EVENT, never its consequences for anyone. Judging consequences is the state disaster
 * authority's job, and this module has the same relationship to it that hydromet has to
 * flood warnings (HYD-4).
 */
export enum SeismicBand {
  Micro = 'micro',
  Minor = 'minor',
  Light = 'light',
  Moderate = 'moderate',
  Strong = 'strong',
  Major = 'major',
}

export interface SeismicEvent {
  id: number;
  sourceEventId: string;
  magnitude: number;
  magnitudeType: string | null;
  band: SeismicBand;
  depthKm: number | null;
  place: string;
  lat: number;
  lng: number;
  occurredAt: string;
  /** `automatic` is an unreviewed machine solution and may be revised. Shown, not hidden. */
  reviewStatus: string | null;
  webUrl: string | null;
  sourceId: number;
}

/** Standard magnitude classes. Boundaries are the conventional ones, not invented. */
export function classifyMagnitude(magnitude: number): SeismicBand {
  if (magnitude < 3) return SeismicBand.Micro;
  if (magnitude < 4) return SeismicBand.Minor;
  if (magnitude < 5) return SeismicBand.Light;
  if (magnitude < 6) return SeismicBand.Moderate;
  if (magnitude < 7) return SeismicBand.Strong;
  return SeismicBand.Major;
}

export function toSeismicEvent(row: SeismicEventRow): SeismicEvent | null {
  const occurredAt = toIsoUtc(row.occurred_at);
  // A record whose timestamp cannot be converted is dropped rather than emitted with a
  // fabricated one — an earthquake with the wrong time is worse than one not shown.
  if (occurredAt === null) return null;

  const magnitude = Number(row.magnitude);

  return {
    id: row.id,
    sourceEventId: row.source_event_id,
    magnitude,
    magnitudeType: row.magnitude_type,
    band: classifyMagnitude(magnitude),
    depthKm: row.depth_km === null ? null : Number(row.depth_km),
    place: row.place,
    lat: Number(row.lat),
    lng: Number(row.lng),
    occurredAt,
    reviewStatus: row.review_status,
    webUrl: row.web_url,
    sourceId: row.source_id,
  };
}
