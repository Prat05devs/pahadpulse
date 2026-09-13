import { z } from 'zod';

export const BusinessWeightsSchema = z.object({
  connectivity: z.number(),
  tourism: z.number(),
  roads: z.number(),
  urbanPopulation: z.number(),
  agriculture: z.number(),
  safety: z.number(),
});

export type BusinessWeights = z.infer<typeof BusinessWeightsSchema>;

export const BusinessScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  weights: BusinessWeightsSchema,
});

export type BusinessScenario = z.infer<typeof BusinessScenarioSchema>;

export const BusinessEvidenceFactSchema = z.object({
  label: z.string(),
  value: z.number(),
  unit: z.string(),
  vintage: z.string(),
  source: z.string(),
  sourceUrl: z.string().nullable().optional(),
});

export const BusinessMetricDetailSchema = z.object({
  available: z.boolean(),
  score: z.number().nullable(),
  summary: z.string(),
  facts: z.array(BusinessEvidenceFactSchema),
});

const BusinessMetricDetailsSchema = z.object({
  connectivity: BusinessMetricDetailSchema,
  tourism: BusinessMetricDetailSchema,
  roads: BusinessMetricDetailSchema,
  urbanPopulation: BusinessMetricDetailSchema,
  agriculture: BusinessMetricDetailSchema,
  safety: BusinessMetricDetailSchema,
});

export const ComparisonDistrictSchema = z.object({
  slug: z.string(),
  name: z.string(),
  score: z.number(),
  metrics: BusinessWeightsSchema,
  // Optional during the independent Render/Vercel deployment window.
  metricDetails: BusinessMetricDetailsSchema.optional(),
});

export const ComparisonReportSchema = z.object({
  winner: z.string(),
  districtA: ComparisonDistrictSchema,
  districtB: ComparisonDistrictSchema,
  scenario: BusinessScenarioSchema,
  verdict: z.string(),
  // Optional so the new frontend can still read the previous API while Render deploys.
  evidence: z
    .object({
      confidence: z.enum(['low', 'medium', 'high']),
      coveragePct: z.number(),
      availableWeight: z.number(),
      requestedWeight: z.number(),
      availableMetrics: z.array(BusinessWeightsSchema.keyof()),
      missingMetrics: z.array(BusinessWeightsSchema.keyof()),
      note: z.string(),
    })
    .optional(),
});

export type ComparisonReport = z.infer<typeof ComparisonReportSchema>;
