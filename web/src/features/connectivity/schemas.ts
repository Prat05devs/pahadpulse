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

export const ConnectionKindSchema = z.enum(['fixed', 'mobile']);

/**
 * How much weight a district's figure can bear, graded by the API.
 *
 * Parsed as an enum rather than recomputed from `tests` here: one threshold, on the server,
 * so the page and any other client cannot disagree about which figures are thin.
 */
export const SampleStrengthSchema = z.enum(['strong', 'moderate', 'thin']);

export const NetworkPerformanceSchema = z.object({
  kind: ConnectionKindSchema,
  quarterStart: DateOnly,
  downloadMbps: z.number(),
  uploadMbps: z.number(),
  latencyMs: z.number(),
  sample: z.object({
    tiles: z.number(),
    tests: z.number(),
    devices: z.number(),
    strength: SampleStrengthSchema,
  }),
  sourceId: z.number(),
  vintage: DateOnly,
  fetchedAt: UtcDateTime,
  provenance: ProvenanceSchema,
});

export const DistrictNetworkSchema = z.object({
  slug: z.string(),
  name: LocalisedTextSchema,
  connections: z.array(NetworkPerformanceSchema),
});

export const StateNetworkSchema = z.object({
  quarterStart: DateOnly.nullable(),
  districts: z.array(DistrictNetworkSchema),
  spread: z.array(
    z.object({
      kind: ConnectionKindSchema,
      fastest: z.object({ slug: z.string(), downloadMbps: z.number() }),
      slowest: z.object({ slug: z.string(), downloadMbps: z.number() }),
      ratio: z.number(),
      stateAverageMbps: z.number(),
      districtsMeasured: z.number(),
    })
  ),
  notMeasured: z.array(
    z.object({ slug: z.string(), name: z.object({ en: z.string(), hi: z.string().nullable() }) })
  ),
});

export type ConnectionKind = z.infer<typeof ConnectionKindSchema>;
export type NetworkPerformance = z.infer<typeof NetworkPerformanceSchema>;
export type DistrictNetwork = z.infer<typeof DistrictNetworkSchema>;
export type StateNetwork = z.infer<typeof StateNetworkSchema>;
