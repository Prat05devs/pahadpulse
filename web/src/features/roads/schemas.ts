import { z } from 'zod';

const LocalisedTextSchema = z.object({ en: z.string(), hi: z.string() });

const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const UtcDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, 'expected UTC datetime');

const ProvenanceSchema = z
  .object({
    sourceKey: z.string(),
    department: LocalisedTextSchema,
    url: z.string().nullable(),
    attribution: z.string(),
    vintage: DateOnly,
    fetchedAt: UtcDateTime,
    freshness: z.enum(['fresh', 'stale', 'expired', 'unknown']),
    mayRedistribute: z.boolean(),
  })
  .nullable();

export const RoadRouteSchema = z.object({
  id: z.number(),
  ref: z.string(),
  network: z.enum(['NH', 'SH']),
  routeNumber: z.string(),
  /** Distinct tagged ways carrying this ref inside the state. An ordering hint, not a length. */
  segmentCount: z.number(),
  /** [west, south, east, north] — the highway's extent inside the state, for framing it. */
  bounds: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable(),
  sourceId: z.number(),
  vintage: DateOnly,
  fetchedAt: UtcDateTime,
  provenance: ProvenanceSchema,
});

export const RoadNetworkSchema = z.object({
  national: z.array(RoadRouteSchema),
  state: z.array(RoadRouteSchema),
  isCrowdSourced: z.literal(true),
});

export type RoadRoute = z.infer<typeof RoadRouteSchema>;
export type RoadNetwork = z.infer<typeof RoadNetworkSchema>;

const IsoDateTime = z.string().datetime({ offset: true });

export const RoadClosureStatusSchema = z.enum([
  'closed',
  'partially_closed',
  'partially_opened',
  'open',
  'unknown',
]);

export const RoadClosureSchema = z.object({
  id: z.number(),
  roadName: z.string(),
  roadType: z.string().nullable(),
  /** The km markers PWD highlights as blocked now. */
  kmMarkers: z.string().nullable(),
  department: z.string().nullable(),
  division: z.string().nullable(),
  district: z.object({ slug: z.string(), name: z.string() }).nullable(),
  status: RoadClosureStatusSchema,
  closedAt: IsoDateTime,
  /** The division's own estimate — shown as theirs, never as a promise. */
  expectedOpenAt: IsoDateTime.nullable(),
  estimatePassed: z.boolean(),
  /** When Pahad Pulse first saw the current status; the honest "reopened by" time. */
  statusSeenAt: IsoDateTime,
});

/**
 * `available: false` means the lists must not be read as the state of the roads — the source
 * is not yet cleared for display, never checked, or its last check is too old. An empty list
 * is then NOT "no closures".
 */
export const RoadClosuresReportSchema = z.object({
  available: z.boolean(),
  unavailableReason: z.enum(['not_permitted', 'never_checked', 'stale']).nullable(),
  checkedAt: IsoDateTime.nullable(),
  closures: z.array(RoadClosureSchema),
  recentlyReopened: z.array(RoadClosureSchema),
  source: z.object({ department: z.string(), url: z.string(), attribution: z.string() }),
});

export type RoadClosure = z.infer<typeof RoadClosureSchema>;
export type RoadClosuresReport = z.infer<typeof RoadClosuresReportSchema>;
