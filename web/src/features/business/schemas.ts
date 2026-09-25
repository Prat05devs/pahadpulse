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

export const BusinessSchemeSchema = z.object({
  id: z.number(),
  group: z.string(),
  slug: z.string(),
  name: z.string(),
  acronym: z.string(),
  owner: z.string(),
  sector: z.array(z.string()),
  stage: z.array(z.string()),
  support: z.array(z.string()),
  access: z.string(),
  status: z.string(),
  summary: z.string(),
  eligibility: z.array(z.string()),
  benefits: z.array(z.string()),
  apply: z.array(z.string()),
  url: z.string().url(),
  availability: z.string(),
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
  recommendedSchemes: z.array(BusinessSchemeSchema).optional(),
});

export type ComparisonReport = z.infer<typeof ComparisonReportSchema>;

export const BusinessSchemeDirectorySchema = z.object({
  verifiedOn: z.string(),
  sourceUrl: z.string().url(),
  total: z.number(),
  filteredCount: z.number(),
  sectors: z.array(z.string()),
  supportTypes: z.array(z.string()),
  schemes: z.array(BusinessSchemeSchema),
});

export type BusinessScheme = z.infer<typeof BusinessSchemeSchema>;
export type BusinessSchemeDirectory = z.infer<typeof BusinessSchemeDirectorySchema>;
