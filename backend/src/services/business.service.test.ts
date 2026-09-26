import { describe, expect, it } from '@jest/globals';

import { budgetDemandsForCategory, normalizeAvailable, weightedScore } from './business.service.js';

describe('business evidence scoring', () => {
  it('preserves missing values instead of turning them into a score', () => {
    expect(normalizeAvailable([10, null, 30])).toEqual([0, null, 100]);
  });

  it('supports inverse indicators such as latency', () => {
    expect(normalizeAvailable([10, 20, 30], { higherIsBetter: false })).toEqual([100, 50, 0]);
  });

  it('uses a neutral position only when every published value is genuinely equal', () => {
    expect(normalizeAvailable([7, 7, null])).toEqual([50, 50, null]);
  });

  it('renormalizes over available evidence and ignores unsupported weighted factors', () => {
    const score = weightedScore(
      {
        connectivity: 80,
        tourism: 20,
        roads: null,
        urbanPopulation: 50,
        agriculture: null,
        safety: null,
      },
      {
        connectivity: 10,
        tourism: 5,
        roads: 10,
        urbanPopulation: 5,
        agriculture: 0,
        safety: 10,
      },
      new Set(['connectivity', 'tourism', 'urbanPopulation']),
    );

    expect(score).toBe(57.5);
  });

  it('returns null when a scenario has no supported evidence', () => {
    expect(
      weightedScore(
        {
          connectivity: null,
          tourism: null,
          roads: null,
          urbanPopulation: null,
          agriculture: null,
          safety: null,
        },
        {
          connectivity: 1,
          tourism: 1,
          roads: 1,
          urbanPopulation: 1,
          agriculture: 1,
          safety: 1,
        },
        new Set(),
      ),
    ).toBeNull();
  });

  it('maps venture categories to relevant state budget demands without district attribution', () => {
    expect(budgetDemandsForCategory('Tourism')).toEqual([26, 24, 22]);
    expect(budgetDemandsForCategory('Agriculture')).toEqual([17, 18, 28, 29]);
    expect(budgetDemandsForCategory('unknown')).toEqual([13, 16, 21, 22, 23, 24]);
  });
});
