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

export const PilgrimArrivalsSchema = z.object({
  destinations: z.array(
    z.object({
      slug: z.string(),
      type: z.enum(['char_dham', 'hill_station', 'trek', 'wildlife', 'religious', 'other']),
      name: LocalisedTextSchema,
      district: z.object({ slug: z.string(), name: LocalisedTextSchema }),
      years: z.array(
        z.object({
          year: z.number(),
          visitors: z.number(),
          vintage: DateOnly,
          fetchedAt: UtcDateTime,
          sourceId: z.number(),
          provenance: ProvenanceSchema,
        })
      ),
    })
  ),
  totals: z.array(z.object({ year: z.number(), visitors: z.number() })),
  years: z.array(z.number()),
});

export type PilgrimArrivals = z.infer<typeof PilgrimArrivalsSchema>;
