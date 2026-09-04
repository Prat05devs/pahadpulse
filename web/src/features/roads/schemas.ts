import { z } from 'zod';

export const RoadSegmentSchema = z.object({
  id: z.number(),
  ref: z.string(),
  name: z.object({
    en: z.string(),
    hi: z.string(),
  }),
  classification: z.enum(['nh', 'sh', 'district', 'other']),
  fromLabel: z.string(),
  toLabel: z.string(),
  sourceId: z.number(),
});

export type RoadSegment = z.infer<typeof RoadSegmentSchema>;

export const RoadStatusSchema = z.object({
  segmentId: z.number(),
  status: z.enum(['open', 'restricted', 'closed', 'unknown']),
  cause: z.string().nullable(),
  reportedAt: z.string().datetime(),
  expectedClearAt: z.string().datetime().nullable(),
  note: z.string().nullable(),
  language: z.string(),
  sourceId: z.number(),
  fetchedAt: z.string().datetime(),
});

export type RoadStatus = z.infer<typeof RoadStatusSchema>;

export const RoadWithStatusSchema = RoadSegmentSchema.extend({
  currentStatus: RoadStatusSchema,
});

export type RoadWithStatus = z.infer<typeof RoadWithStatusSchema>;
