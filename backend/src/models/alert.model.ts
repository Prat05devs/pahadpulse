import type { RowDataPacket } from 'mysql2';

import type {
  AlertCertainty,
  AlertSeverity,
  AlertStatus,
  AlertType,
  AlertUrgency,
} from '../types/alert.js';
import type { Provenance } from './source.model.js';

export const ALERTS_TABLE = 'alerts';
export const ALERT_AREAS_TABLE = 'alert_areas';

export interface AlertRow extends RowDataPacket {
  id: number;
  source_id: number;
  source_alert_id: string;
  type: AlertType;
  severity: AlertSeverity;
  urgency: AlertUrgency;
  certainty: AlertCertainty;
  status: AlertStatus;
  headline: string;
  body: string;
  instruction: string | null;
  language: string;
  authority: string;
  web_url: string | null;
  geometry: unknown;
  centroid_lat: string | null;
  centroid_lng: string | null;
  issued_at: string;
  effective_from: string | null;
  expires_at: string | null;
  fetched_at: string;
}

/**
 * An alert joined to the areas it affects, aggregated as JSON by the repository.
 *
 * Typed as `unknown` rather than `string` because the driver returns this either way: as a
 * JSON string on its own, but as an already-parsed object once the same SELECT also reads a
 * real JSON column (`geometry`). Assuming one shape is what broke every alert endpoint the
 * moment geometry was added to the select.
 */
export interface AlertWithAreasRow extends AlertRow {
  area_ids: unknown;
}

/** Result of a bare `COUNT(*)` aggregate. */
export interface AlertCountRow extends RowDataPacket {
  total: number;
}

export interface LocalisedText {
  en: string;
  hi: string;
}

export interface AlertAreaSummary {
  id: number;
  slug: string;
  name: LocalisedText;
}

/** The domain shape of an alert, before provenance is attached. */
export interface Alert {
  id: number;
  sourceId: number;
  sourceAlertId: string;
  type: AlertType;
  severity: AlertSeverity;
  urgency: AlertUrgency;
  certainty: AlertCertainty;
  status: AlertStatus;
  headline: string;
  body: string;
  instruction: string | null;
  language: string;
  authority: string;
  webUrl: string | null;
  /**
   * GeoJSON Polygon/MultiPolygon of the affected area, or null when the source states its
   * area only in prose. Null is the common case, so no surface may require it.
   */
  geometry: unknown;
  centroid: { lat: number; lng: number } | null;
  issuedAt: string;
  effectiveFrom: string | null;
  expiresAt: string | null;
  fetchedAt: string;
  areas: AlertAreaSummary[];
}

/** What every alert carries before provenance is attached (matches HasProvenance). */
export interface AlertWithProvenanceFields {
  sourceId: number;
  vintage: string; // issuedAt — see 008-create-alerts.sql header note
  fetchedAt: string;
}

export type AlertOut = Alert & { provenance: Provenance | null };

/** Accepts a JSON column in either of the two shapes the driver hands back. See
 *  `AlertWithAreasRow.area_ids`. */
function parseJsonColumn(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  return value ?? null;
}

function toAlertAreaSummaries(value: unknown): AlertAreaSummary[] {
  const parsed = parseJsonColumn(value);
  if (!Array.isArray(parsed)) return [];

  return (
    parsed as { id: number | null; slug: string; name_en: string; name_hi: string }[]
  )
    .filter((a) => a.id !== null)
    .map((a) => ({
      id: a.id as number,
      slug: a.slug,
      name: { en: a.name_en, hi: a.name_hi },
    }));
}

export function toAlert(row: AlertWithAreasRow): Alert {
  return {
    id: row.id,
    sourceId: row.source_id,
    sourceAlertId: row.source_alert_id,
    type: row.type,
    severity: row.severity,
    urgency: row.urgency,
    certainty: row.certainty,
    status: row.status,
    headline: row.headline,
    body: row.body,
    instruction: row.instruction,
    language: row.language,
    authority: row.authority,
    webUrl: row.web_url,
    geometry: parseJsonColumn(row.geometry),
    centroid:
      row.centroid_lat !== null && row.centroid_lng !== null
        ? { lat: Number(row.centroid_lat), lng: Number(row.centroid_lng) }
        : null,
    issuedAt: row.issued_at,
    effectiveFrom: row.effective_from,
    expiresAt: row.expires_at,
    fetchedAt: row.fetched_at,
    areas: toAlertAreaSummaries(row.area_ids),
  };
}
