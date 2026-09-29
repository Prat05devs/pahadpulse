import { toIsoUtc } from '../utils/datetime.js';

export const FIRE_DETECTIONS_TABLE = 'fire_detections';
export const FIRE_DISTRICT_NOTICES_TABLE = 'fire_district_notices';

export type FireConfidence = 'low' | 'nominal' | 'high';

/** A row joined with its district and source, as the map query returns it. */
export interface FireDetectionRow {
  id: number;
  sensor: string;
  satellite: string;
  instrument: string;
  confidence: FireConfidence;
  frp_mw: string | null;
  day_night: 'D' | 'N' | null;
  lat: string;
  lng: string;
  acquired_at: string;
  area_slug: string;
  area_name_en: string;
  area_name_hi: string | null;
  attribution: string;
}

/** One detection as the map serves it. Times are ISO-8601 UTC. */
export interface FireDetectionOut {
  id: number;
  sensor: string;
  satellite: string;
  instrument: string;
  confidence: FireConfidence;
  frpMw: number | null;
  dayNight: 'D' | 'N' | null;
  lat: number;
  lng: number;
  acquiredAt: string;
  district: { slug: string; nameEn: string; nameHi: string | null };
  attribution: string;
}

/** A district with detections nobody has been told about, for the notification pass. */
export interface PendingFireDistrictRow {
  area_id: number;
  slug: string;
  name_en: string;
  name_hi: string | null;
  detections: number;
}

export function toFireDetection(row: FireDetectionRow): FireDetectionOut | null {
  const acquiredAt = toIsoUtc(row.acquired_at);
  // A detection with no usable time cannot be placed in the 48-hour window, so it is dropped.
  if (acquiredAt === null) return null;

  return {
    id: row.id,
    sensor: row.sensor,
    satellite: row.satellite,
    instrument: row.instrument,
    confidence: row.confidence,
    frpMw: row.frp_mw === null ? null : Number(row.frp_mw),
    dayNight: row.day_night,
    lat: Number(row.lat),
    lng: Number(row.lng),
    acquiredAt,
    district: { slug: row.area_slug, nameEn: row.area_name_en, nameHi: row.area_name_hi },
    attribution: row.attribution,
  };
}
