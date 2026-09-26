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

const GuidePlaceSchema = z.object({
  slug: z.string(),
  name: z.string(),
  district: z.string(),
  imageUrl: z.string().url(),
  officialUrl: z.string().url(),
  mapDestination: z.string(),
  lat: z.number(),
  lng: z.number(),
});

export const TourismGuideSchema = z.object({
  verifiedOn: DateOnly,
  sourceUrl: z.string().url(),
  charDham: z.array(
    GuidePlaceSchema.extend({
      nameHi: z.string(),
      altitudeM: z.number().int().positive(),
      bestSeason: z.string(),
      access: z.string(),
      imageAlt: z.string(),
    })
  ),
  pilgrimages: z.array(GuidePlaceSchema.extend({ category: z.string(), summary: z.string() })),
  destinations: z.array(GuidePlaceSchema.extend({ category: z.string(), summary: z.string() })),
  officialLinks: z.array(
    z.object({
      label: z.string(),
      description: z.string(),
      url: z.string().url(),
      kind: z.enum(['primary', 'guide', 'map']),
    })
  ),
  guidelines: z.array(z.string()),
  helplines: z.object({ yatra: z.array(z.string()), emergency: z.string() }),
});

export const TourismOverviewSchema = z.object({
  guide: TourismGuideSchema,
  arrivals: PilgrimArrivalsSchema,
});

export type TourismGuide = z.infer<typeof TourismGuideSchema>;
export type TourismOverview = z.infer<typeof TourismOverviewSchema>;
