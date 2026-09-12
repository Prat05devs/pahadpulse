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
