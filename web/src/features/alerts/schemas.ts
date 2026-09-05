import { z } from 'zod';

const LocalisedTextSchema = z.object({
  en: z.string(),
  hi: z.string(),
});

/**
 * The API's own timestamp format, not ISO-8601: `YYYY-MM-DD HH:mm:ss` in UTC. Typing these
 * as `.datetime()` made every alert response fail validation, and the district page's
 * `.catch(() => null)` then turned that into a silently empty section.
 */
const UtcDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, 'expected UTC datetime');

const ProvenanceSchema = z
  .object({
    sourceKey: z.string(),
    department: LocalisedTextSchema,
    url: z.string().nullable(),
    attribution: z.string(),
    // An alert's vintage is a full timestamp, not a date: what it describes is the moment
    // the authority ISSUED it (cap:sent). That is unlike a statistical indicator, whose
    // vintage is a date such as a census year — hence the two different formats.
    vintage: UtcDateTime,
    fetchedAt: UtcDateTime,
    freshness: z.enum(['fresh', 'stale', 'expired', 'unknown']),
    mayRedistribute: z.boolean(),
  })
  .nullable();

const AlertAreaSummarySchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: LocalisedTextSchema,
});

export const AlertSchema = z.object({
  id: z.number(),
  sourceId: z.number(),
  sourceAlertId: z.string(),
  type: z.enum(['weather', 'river', 'flood', 'road', 'disaster']),
  severity: z.enum(['minor', 'moderate', 'severe', 'extreme', 'unknown']),
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

/**
 * `/alerts/active` answers with the alert array under `data`, and puts `pagination`
 * alongside it in the envelope rather than inside it. `apiClient.get` unwraps and returns
 * `data` only, so what a caller receives here is the array — not a `{ data, pagination }`
 * object, which is what this schema used to claim.
 */
export const ActiveAlertsSchema = z.array(AlertSchema);

export type ActiveAlerts = z.infer<typeof ActiveAlertsSchema>;

export const AlertSummarySchema = z.object({
  activeCount: z.number(),
  bySeverity: z.record(z.number()),
});

export type AlertSummary = z.infer<typeof AlertSummarySchema>;
