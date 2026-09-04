import { z } from 'zod';

const LocalisedTextSchema = z.object({
  en: z.string(),
  hi: z.string(),
});

const ProvenanceSchema = z.object({
  sourceId: z.number(),
  department: LocalisedTextSchema,
  url: z.string().nullable(),
  attribution: z.string(),
  vintage: z.string().datetime(),
  fetchedAt: z.string().datetime(),
  cadence: z.string(),
}).optional().nullable();

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
  severity: z.enum(['minor', 'moderate', 'severe', 'extreme']),
  urgency: z.enum(['unknown', 'immediate', 'expected', 'future', 'past', 'exercised']),
  certainty: z.enum(['unknown', 'observed', 'likely', 'possible', 'unlikely']),
  status: z.enum(['active', 'expired', 'cancelled', 'superseded']),
  headline: z.string(),
  body: z.string(),
  instruction: z.string().nullable(),
  language: z.string(),
  authority: z.string(),
  webUrl: z.string().nullable(),
  issuedAt: z.string().datetime(),
  effectiveFrom: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  fetchedAt: z.string().datetime(),
  areas: z.array(AlertAreaSummarySchema),
  provenance: ProvenanceSchema,
});

export type Alert = z.infer<typeof AlertSchema>;

export const PaginationSchema = z.object({
  cursor: z.number(),
  limit: z.number(),
  hasMore: z.boolean(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const PaginatedAlertsSchema = z.object({
  data: z.array(AlertSchema),
  pagination: PaginationSchema,
});

export type PaginatedAlerts = z.infer<typeof PaginatedAlertsSchema>;

export const AlertSummarySchema = z.object({
  activeCount: z.number(),
  bySeverity: z.record(z.number()),
});

export type AlertSummary = z.infer<typeof AlertSummarySchema>;
