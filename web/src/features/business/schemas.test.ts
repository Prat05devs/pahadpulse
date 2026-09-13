import { describe, expect, it } from 'vitest';

import { ComparisonReportSchema } from './schemas';

const weights = {
  connectivity: 8,
  tourism: 10,
  roads: 8,
  urbanPopulation: 4,
  agriculture: 2,
  safety: 7,
};

const legacyReport = {
  winner: 'dehradun',
  districtA: { slug: 'dehradun', name: 'Dehradun', score: 54, metrics: weights },
  districtB: { slug: 'chamoli', name: 'Chamoli', score: 46, metrics: weights },
  scenario: {
    id: 't2',
    name: 'Large Hotel Resort',
    category: 'Tourism',
    description: 'High-capacity hotel with amenities.',
    weights,
  },
  verdict: 'Comparison result.',
};

describe('business comparison deploy tolerance', () => {
  it('accepts the previous API while Render and Vercel deploy independently', () => {
    expect(ComparisonReportSchema.safeParse(legacyReport).success).toBe(true);
  });

  it('accepts the evidence-aware API response', () => {
    const parsed = ComparisonReportSchema.safeParse({
      ...legacyReport,
      evidence: {
        confidence: 'medium',
        coveragePct: 56,
        availableWeight: 22,
        requestedWeight: 39,
        availableMetrics: ['connectivity', 'tourism', 'urbanPopulation'],
        missingMetrics: ['roads', 'agriculture', 'safety'],
        note: 'Missing evidence is excluded.',
      },
    });

    expect(parsed.success).toBe(true);
  });
});
