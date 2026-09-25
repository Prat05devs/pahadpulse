import { describe, expect, it } from 'vitest';

import type { DistrictStanding } from '@/features/governance/schemas';
import type { Indicator } from '@/features/indicators/schemas';

import {
  buildBenchmarkRows,
  buildCoverageRows,
  buildSectorCoverage,
  parseIntelligenceFilters,
} from './model';

const catalogue: Indicator[] = [
  {
    key: 'literacy_rate',
    category: 'education',
    label: { en: 'Literacy Rate', hi: 'साक्षरता दर' },
    unit: 'percent',
    decimals: 1,
    higherIsBetter: true,
    scope: 'district',
  },
  {
    key: 'population',
    category: 'demography',
    label: { en: 'Population', hi: 'जनसंख्या' },
    unit: 'count',
    decimals: 0,
    higherIsBetter: null,
    scope: 'district',
  },
  {
    key: 'hospital_beds',
    category: 'health',
    label: { en: 'Hospital Beds', hi: 'अस्पताल में शय्या' },
    unit: 'count',
    decimals: 0,
    higherIsBetter: true,
    scope: 'district',
  },
  {
    key: 'internet_penetration_pct',
    category: 'connectivity',
    label: { en: 'Internet Penetration', hi: 'इंटरनेट प्रवेश' },
    unit: 'percent',
    decimals: 1,
    higherIsBetter: true,
    scope: 'district',
  },
  {
    key: 'state_population',
    category: 'demography',
    label: { en: 'Population', hi: 'जनसंख्या' },
    unit: 'count',
    decimals: 0,
    higherIsBetter: null,
    scope: 'state',
  },
];

const ranked = {
  key: 'literacy_rate',
  label: 'Literacy Rate',
  unit: 'percent',
  decimals: 1,
  vintage: '2011-03-01',
  value: 80,
  rank: 1,
  of: 2,
};

const standing: DistrictStanding = {
  districts: [
    {
      slug: 'alpha',
      name: 'Alpha',
      ranked: [ranked],
      strengths: [ranked],
      weaknesses: [ranked],
    },
    {
      slug: 'beta',
      name: 'Beta',
      ranked: [{ ...ranked, value: 70, rank: 2 }],
      strengths: [{ ...ranked, value: 70, rank: 2 }],
      weaknesses: [{ ...ranked, value: 70, rank: 2 }],
    },
  ],
  used: [{ key: 'literacy_rate', label: 'Literacy Rate', vintage: '2011-03-01' }],
  excluded: [
    { key: 'population', label: 'Population', vintage: '2011-03-01', reason: 'no-direction' },
    {
      key: 'hospital_beds',
      label: 'Hospital Beds',
      vintage: '2018-03-31',
      reason: 'partial-coverage',
    },
  ],
  needsAttention: [
    { slug: 'beta', name: 'Beta', bottomHalf: 1, of: 1, worst: [{ ...ranked, rank: 2 }] },
    { slug: 'alpha', name: 'Alpha', bottomHalf: 0, of: 1, worst: [ranked] },
  ],
};

describe('buildCoverageRows', () => {
  it('separates comparable, contextual, partial, catalogue-only and state metrics', () => {
    const rows = buildCoverageRows(catalogue, standing);
    const status = new Map(rows.map((row) => [row.key, row.status]));

    expect(status).toEqual(
      new Map([
        ['population', 'context'],
        ['state_population', 'state'],
        ['literacy_rate', 'comparable'],
        ['hospital_beds', 'partial'],
        ['internet_penetration_pct', 'catalogue'],
      ])
    );
    expect(rows.find((row) => row.key === 'hospital_beds')?.vintage).toBe('2018-03-31');
  });

  it('does not claim catalogue gaps when the coverage service itself is down', () => {
    const rows = buildCoverageRows(catalogue, null);

    expect(rows.find((row) => row.key === 'literacy_rate')?.status).toBe('unavailable');
    expect(rows.find((row) => row.key === 'state_population')?.status).toBe('state');
  });
});

describe('buildSectorCoverage', () => {
  it('computes full district coverage without counting state metrics', () => {
    const sectors = buildSectorCoverage(buildCoverageRows(catalogue, standing));
    const demography = sectors.find((sector) => sector.category === 'demography');

    expect(demography).toMatchObject({
      total: 2,
      districtTotal: 1,
      districtComplete: 1,
      stateLevel: 1,
      coveragePercent: 100,
    });
  });
});

describe('buildBenchmarkRows', () => {
  it('preserves the ranking direction instead of assuming the largest value wins', () => {
    const [row] = buildBenchmarkRows(standing);

    expect(row?.leaders.map((district) => district.name)).toEqual(['Alpha']);
    expect(row?.trailers.map((district) => district.name)).toEqual(['Beta']);
  });
});

describe('parseIntelligenceFilters', () => {
  it('takes the first repeated query value and rejects unknown status values', () => {
    expect(
      parseIntelligenceFilters({ q: ['literacy', 'ignored'], sector: 'education', status: 'bad' })
    ).toEqual({ q: 'literacy', sector: 'education', status: undefined });
  });
});
