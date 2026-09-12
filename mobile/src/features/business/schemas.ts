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

export const ComparisonDistrictSchema = z.object({
  slug: z.string(),
  name: z.string(),
  score: z.number(),
  metrics: BusinessWeightsSchema,
});

export const ComparisonReportSchema = z.object({
  winner: z.string(),
  districtA: ComparisonDistrictSchema,
  districtB: ComparisonDistrictSchema,
  scenario: BusinessScenarioSchema,
  verdict: z.string(),
});

export type ComparisonReport = z.infer<typeof ComparisonReportSchema>;
