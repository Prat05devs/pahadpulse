import { describe, expect, it } from '@jest/globals';

import {
  buildProfiles,
  rankByNeed,
  type IndicatorSeriesInput,
} from './district-profile.service.js';

const districts = [
  { slug: 'dehradun', name: 'Dehradun' },
  { slug: 'nainital', name: 'Nainital' },
  { slug: 'chamoli', name: 'Chamoli' },
];

function series(overrides: Partial<IndicatorSeriesInput> = {}): IndicatorSeriesInput {
  return {
    key: 'literacy_rate',
    label: 'Literacy Rate',
    unit: 'percent',
    decimals: 1,
    higherIsBetter: true,
    vintage: '2011-03-01',
    values: [
      { slug: 'dehradun', name: 'Dehradun', value: 84.2 },
      { slug: 'nainital', name: 'Nainital', value: 83.0 },
      { slug: 'chamoli', name: 'Chamoli', value: 82.0 },
    ],
    ...overrides,
  };
}

describe('buildProfiles', () => {
  it('ranks the highest value first when higher is better', () => {
    const report = buildProfiles([series()], districts);
    const dehradun = report.districts.find((d) => d.slug === 'dehradun');

    expect(dehradun?.strengths[0]).toMatchObject({ key: 'literacy_rate', rank: 1, of: 3 });
    expect(report.districts.find((d) => d.slug === 'chamoli')?.weaknesses[0]?.rank).toBe(3);
  });

  it('ranks the lowest value first when lower is better', () => {
    const report = buildProfiles(
      [series({ key: 'sdg_composite_rank', higherIsBetter: false })],
      districts,
    );

    expect(report.districts.find((d) => d.slug === 'chamoli')?.ranked[0]?.rank).toBe(1);
  });

  /** Two districts on the same figure are not different, and must not be shown as different. */
  it('gives tied districts the same rank', () => {
    const tied = series({
      values: [
        { slug: 'dehradun', name: 'Dehradun', value: 84 },
        { slug: 'nainital', name: 'Nainital', value: 84 },
        { slug: 'chamoli', name: 'Chamoli', value: 80 },
      ],
    });

    const report = buildProfiles([tied], districts);

    expect(report.districts.find((d) => d.slug === 'dehradun')?.ranked[0]?.rank).toBe(1);
    expect(report.districts.find((d) => d.slug === 'nainital')?.ranked[0]?.rank).toBe(1);
    expect(report.districts.find((d) => d.slug === 'chamoli')?.ranked[0]?.rank).toBe(3);
  });

  /**
   * Both exclusions exist because a confident-looking rank over missing or directionless data
   * is worse than no rank: it reads as a finding.
   */
  it('excludes an indicator with no direction, and says so', () => {
    const report = buildProfiles([series({ key: 'population', higherIsBetter: null })], districts);

    expect(report.used).toHaveLength(0);
    expect(report.excluded).toEqual([
      {
        key: 'population',
        label: 'Literacy Rate',
        vintage: '2011-03-01',
        reason: 'no-direction',
      },
    ]);
  });

  it('excludes an indicator that does not cover every district, and says so', () => {
    const partial = series({
      key: 'hospital_beds',
      values: [{ slug: 'dehradun', name: 'Dehradun', value: 900 }],
    });

    const report = buildProfiles([partial], districts);

    expect(report.districts.every((d) => d.ranked.length === 0)).toBe(true);
    expect(report.excluded[0]).toMatchObject({
      key: 'hospital_beds',
      vintage: '2011-03-01',
      reason: 'partial-coverage',
    });
  });
});

describe('rankByNeed', () => {
  it('puts the district with the most bottom-half placements first', () => {
    const report = buildProfiles(
      [series(), series({ key: 'per_capita_income', vintage: '2022-03-31' })],
      districts,
    );

    const ordered = rankByNeed(report.districts);

    expect(ordered[0]?.slug).toBe('chamoli');
    expect(ordered[0]?.bottomHalf).toBe(2);
    expect(ordered[ordered.length - 1]?.slug).toBe('dehradun');
  });
});
