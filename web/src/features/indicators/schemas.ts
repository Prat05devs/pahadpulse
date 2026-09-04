import { z } from 'zod';

export const IndicatorSchema = z.object({
  key: z.string(),
  category: z.string(),
  label: z.object({
    en: z.string(),
    hi: z.string(),
  }),
  unit: z.string(),
  decimals: z.number(),
  higherIsBetter: z.boolean().nullable(),
  scope: z.enum(['state', 'district', 'village']),
});

export type Indicator = z.infer<typeof IndicatorSchema>;

export const IndicatorValueSchema = z.object({
  indicatorKey: z.string(),
  areaId: z.number(),
  vintage: z.number(),
  value: z.number(),
  sourceId: z.number(),
  fetchedAt: z.string().datetime(),
  label: z.object({
    en: z.string(),
    hi: z.string(),
  }).optional(),
  unit: z.string().optional(),
});

export type IndicatorValue = z.infer<typeof IndicatorValueSchema>;

export const ProvenanceSchema = z.object({
  sourceId: z.number(),
  department: z.object({
    en: z.string(),
    hi: z.string(),
  }),
  url: z.string().nullable(),
  attribution: z.string(),
  vintage: z.string().datetime(),
  fetchedAt: z.string().datetime(),
  cadence: z.string(),
}).optional().nullable();

export const AreaIndicatorsSchema = z.array(
  IndicatorValueSchema.extend({
    provenance: ProvenanceSchema,
  })
);

export type AreaIndicators = z.infer<typeof AreaIndicatorsSchema>;
