import { z } from 'zod';

import { LocalisedTextSchema, ProvenanceSchema, UtcDateTime } from '@/types/api';

/**
 * Alerts: weather warnings, river and flood notices, road closures, disaster declarations.
 *
 * Every timestamp here is `UtcDateTime`, not `z.string().datetime()`. The API sends
 * `YYYY-MM-DD HH:mm:ss` in UTC, and typing these as ISO made every alert response fail
 * validation on the web app — which then rendered an empty page rather than an error, so
 * nobody noticed for weeks.
 */

export const AlertTypeSchema = z.enum(['weather', 'river', 'flood', 'road', 'disaster']);
export type AlertType = z.infer<typeof AlertTypeSchema>;

export const AlertSeveritySchema = z.enum(['minor', 'moderate', 'severe', 'extreme', 'unknown']);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

const AlertAreaSummarySchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: LocalisedTextSchema,
});

export const AlertSchema = z.object({
  id: z.number(),
  sourceId: z.number(),
  sourceAlertId: z.string(),
  type: AlertTypeSchema,
  severity: AlertSeveritySchema,
  urgency: z.enum(['unknown', 'immediate', 'expected', 'future', 'past']),
  certainty: z.enum(['unknown', 'observed', 'likely', 'possible', 'unlikely']),
  status: z.enum(['active', 'expired', 'cancelled', 'superseded']),
  headline: z.string(),
  body: z.string(),
  instruction: z.string().nullable(),
  language: z.string(),
  authority: z.string(),
  webUrl: z.string().nullable(),
  geometry: z.unknown().nullable(),
  centroid: z.object({ lat: z.number(), lng: z.number() }).nullable(),
  issuedAt: UtcDateTime,
  effectiveFrom: UtcDateTime.nullable(),
  expiresAt: UtcDateTime.nullable(),
  fetchedAt: UtcDateTime,
  areas: z.array(AlertAreaSummarySchema),
  provenance: ProvenanceSchema,
});

export type Alert = z.infer<typeof AlertSchema>;

/** Re-check expiry before presenting a warning saved in the offline cache as current. */
export function isAlertInForce(
  alert: Pick<Alert, 'status' | 'expiresAt'>,
  now = Date.now(),
): boolean {
  if (alert.status !== 'active') return false;
  if (!alert.expiresAt) return true;

  const normalised = alert.expiresAt.includes('T')
    ? alert.expiresAt
    : `${alert.expiresAt.replace(' ', 'T')}Z`;
  const expiresAt = new Date(normalised).getTime();

  // Preserve warnings with malformed source timestamps instead of silently discarding them.
  return Number.isNaN(expiresAt) || expiresAt > now;
}

/**
 * `/alerts/active` returns the array under `data` and puts `pagination` beside it in the
 * envelope. The client unwraps `data`, so what arrives here is the array itself.
 */
export const AlertListSchema = z.array(AlertSchema);

export const AlertSummarySchema = z.object({
  activeCount: z.number(),
  bySeverity: z.record(z.number()),
});

export type AlertSummary = z.infer<typeof AlertSummarySchema>;

/** Ordered most severe first, for sorting and for "at least this severe" filters. */
export const SEVERITY_RANK: Record<AlertSeverity, number> = {
  extreme: 4,
  severe: 3,
  moderate: 2,
  minor: 1,
  unknown: 0,
};
