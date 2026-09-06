import { z } from 'zod';

export const SEISMIC_BANDS = [
  'micro',
  'minor',
  'light',
  'moderate',
  'strong',
  'major',
] as const;

export type SeismicBand = (typeof SEISMIC_BANDS)[number];

export const SeismicEventSchema = z.object({
  id: z.number(),
  sourceEventId: z.string(),
  magnitude: z.number(),
  /** mb, ml, mw — not interchangeable, so it is shown rather than dropped. */
  magnitudeType: z.string().nullable(),
  band: z.enum(SEISMIC_BANDS),
  depthKm: z.number().nullable(),
  place: z.string(),
  lat: z.number(),
  lng: z.number(),
  occurredAt: z.string(),
  /** `automatic` means an unreviewed machine solution that may still be revised. */
  reviewStatus: z.string().nullable(),
  webUrl: z.string().nullable(),
  sourceId: z.number(),
});

export type SeismicEvent = z.infer<typeof SeismicEventSchema>;

export const RecentSeismicSchema = z.object({
  events: z.array(SeismicEventSchema),
  countLast30Days: z.number(),
  largest: SeismicEventSchema.nullable(),
  source: z
    .object({
      key: z.string(),
      department: z.object({ en: z.string(), hi: z.string() }),
      attribution: z.string(),
      url: z.string(),
    })
    .nullable(),
});

export type RecentSeismic = z.infer<typeof RecentSeismicSchema>;
