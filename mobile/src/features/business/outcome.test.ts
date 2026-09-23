import { outcomeOf, readMetric } from './outcome';
import type { ComparisonDistrict, ComparisonReport } from './schemas';

function metricDetail(available: boolean, score: number | null) {
  return { available, score, summary: 'x', facts: [] };
}

function district(slug: string, name: string, withDetails = true): ComparisonDistrict {
  return {
    slug,
    name,
    score: 84,
    // As the API sends them: a number for every metric, measured or not.
    metrics: {
      connectivity: 96,
      tourism: 76,
      roads: 50,
      urbanPopulation: 83,
      agriculture: 50,
      safety: 50,
    },
    ...(withDetails
      ? {
          metricDetails: {
            connectivity: metricDetail(true, 96),
            tourism: metricDetail(true, 76),
            roads: metricDetail(false, null),
            urbanPopulation: metricDetail(true, 83),
            agriculture: metricDetail(false, null),
            safety: metricDetail(false, null),
          },
        }
      : {}),
  };
}

function report(winner: string): ComparisonReport {
  return {
    winner,
    districtA: district('dehradun', 'Dehradun'),
    districtB: district('nainital', 'Nainital'),
    scenario: {
      id: 't1',
      name: 'Boutique Homestay',
      category: 'Tourism',
      description: 'x',
      weights: {
        connectivity: 6,
        tourism: 10,
        roads: 4,
        urbanPopulation: 1,
        agriculture: 3,
        safety: 6,
      },
    },
    verdict: 'x',
  };
}

describe('outcomeOf', () => {
  it('names the district the API picked', () => {
    expect(outcomeOf(report('nainital'))).toEqual({ kind: 'district', name: 'Nainital' });
  });

  it('reports a tie as a tie', () => {
    expect(outcomeOf(report('tie'))).toEqual({ kind: 'tie' });
  });

  /**
   * The regression this exists for. `insufficient` is the API declining to recommend
   * either district; testing only for `tie` let it fall through to the slug comparison,
   * which matched neither district and so credited district B with a recommendation the
   * API had explicitly refused to make.
   */
  it('names no district when the evidence is insufficient', () => {
    expect(outcomeOf(report('insufficient'))).toEqual({ kind: 'insufficient' });
  });
});

describe('readMetric', () => {
  it('reports a measured metric with its score', () => {
    expect(readMetric(district('dehradun', 'Dehradun'), 'connectivity')).toEqual({
      available: true,
      score: 96,
    });
  });

  /** The 50 in `metrics` is a placeholder for the index maths, not a measurement. */
  it('never returns a score for a metric that was not measured', () => {
    expect(readMetric(district('dehradun', 'Dehradun'), 'roads').available).toBe(false);
  });

  it('falls back to the plain metrics when the API sends no detail at all', () => {
    // An older API, or an installed build reading one: its numbers are all there is.
    expect(readMetric(district('dehradun', 'Dehradun', false), 'roads')).toEqual({
      available: true,
      score: 50,
    });
  });
});
