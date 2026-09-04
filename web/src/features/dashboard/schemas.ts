import { z } from 'zod';

const LocalisedTextSchema = z.object({
  en: z.string(),
  hi: z.string(),
});

const CentroidSchema = z.object({
  lat: z.number(),
  lng: z.number(),
}).nullable();

const OfficeialIdsSchema = z.object({
  lgd: z.string().nullable(),
  census2011: z.string().nullable(),
});

export const AreaSchema = z.object({
  id: z.number(),
  type: z.enum(['state', 'district', 'tehsil', 'village']),
  code: z.string(),
  slug: z.string(),
  name: LocalisedTextSchema,
  parentId: z.number().nullable(),
  division: z.string().nullable(),
  headquarters: LocalisedTextSchema.nullable(),
  centroid: CentroidSchema,
  officialIds: OfficeialIdsSchema,
});

export type Area = z.infer<typeof AreaSchema>;

export const DistrictSummarySchema = AreaSchema.extend({
  counts: z.object({
    tehsils: z.number(),
    villages: z.number(),
  }),
  hasBoundary: z.boolean(),
});

export type DistrictSummary = z.infer<typeof DistrictSummarySchema>;

export const AlertSummarySchema = z.object({
  activeCount: z.number(),
  bySeverity: z.record(z.number()),
});

export type AlertSummary = z.infer<typeof AlertSummarySchema>;

// Indicator schemas
export const IndicatorValueSchema = z.object({
  indicator_key: z.string(),
  area_id: z.number(),
  vintage: z.number(),
  value: z.number(),
  source_id: z.number(),
  fetched_at: z.string().datetime(),
});

export type IndicatorValue = z.infer<typeof IndicatorValueSchema>;

// Observation/Weather schemas
export const ObservationSchema = z.object({
  station_id: z.number(),
  metric: z.string(),
  observed_at: z.string().datetime(),
  value: z.number(),
  unit: z.string(),
  source_id: z.number(),
  fetched_at: z.string().datetime(),
});

export type Observation = z.infer<typeof ObservationSchema>;

// Road schemas
export const RoadStatusSchema = z.object({
  segment_id: z.number(),
  status: z.enum(['open', 'restricted', 'closed', 'unknown']),
  cause: z.string().nullable(),
  reported_at: z.string().datetime(),
});

export type RoadStatus = z.infer<typeof RoadStatusSchema>;
