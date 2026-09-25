import { describe, expect, it } from 'vitest';

import { formatCrore, formatRankedValue, formatVintage } from './format';

describe('governance formatters', () => {
  it('converts the source unit of thousands of rupees to crore', () => {
    expect(formatCrore(1_117_032_109)).toBe('₹1,11,703.21 cr');
    expect(formatCrore(189_466)).toBe('₹18.95 cr');
  });

  it('formats indicator values without losing their domain unit', () => {
    expect(
      formatRankedValue({
        key: 'milk',
        label: 'Milk',
        unit: 'kg_per_day',
        decimals: 0,
        vintage: '2022-03-31',
        value: 12_628,
        rank: 1,
        of: 13,
      })
    ).toBe('12,628 kg/day');
  });

  it('renders an unambiguous table vintage', () => {
    expect(formatVintage('2022-03-31')).toBe('31/03/2022');
  });
});
