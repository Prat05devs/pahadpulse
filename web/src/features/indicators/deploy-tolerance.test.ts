import { describe, expect, it } from 'vitest';
import { AreaIndicatorsSchema } from './schemas';

const value = {
  indicator: {
    key: 'population',
    category: 'demography',
    scope: 'district',
    label: { en: 'Population', hi: 'जनसंख्या' },
    unit: 'count',
    decimals: 0,
    higherIsBetter: null,
  },
  value: 622506,
  vintage: '2011-03-01',
  sourceId: 1,
  fetchedAt: '2026-09-07 08:00:00',
  provenance: null,
};

/**
 * Deploy-order tolerance, the same guard the air quality schema carries.
 *
 * `/areas/:slug/indicators` changed from a bare array to `{ values, pending }`. That is a
 * harder break than adding a field: Vercel ships the new frontend in seconds while Render
 * rebuilds the API for minutes, so without this the new page would meet the old array,
 * reject it, and blank both the district Statistics panel and the home page's state figures
 * for the whole window.
 */
describe('area indicators schema deploy tolerance', () => {
  it('accepts the bare array an API that has not redeployed still returns', () => {
    const parsed = AreaIndicatorsSchema.parse([value]);
    expect(parsed.values).toHaveLength(1);
    // Empty rather than invented: an API that cannot report gaps has not reported any.
    expect(parsed.pending).toEqual([]);
  });

  it('accepts the current object', () => {
    const parsed = AreaIndicatorsSchema.parse({
      values: [value],
      pending: [
        {
          key: 'schools_count',
          category: 'education',
          scope: 'district',
          label: { en: 'Schools', hi: 'विद्यालय' },
          unit: 'count',
          decimals: 0,
          higherIsBetter: true,
        },
      ],
    });
    expect(parsed.values).toHaveLength(1);
    expect(parsed.pending.map((entry) => entry.key)).toEqual(['schools_count']);
  });
});
