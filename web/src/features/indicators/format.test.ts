import { describe, expect, it } from 'vitest';

import { formatIndicatorValue } from './format';

describe('formatIndicatorValue', () => {
  it('groups large numbers the Indian way', () => {
    // A reader of an Indian government statistic expects 3,62,688, not 362,688.
    expect(formatIndicatorValue(362688, 'count', 0)).toBe('3,62,688');
  });

  it('renders the units the catalogue actually uses', () => {
    expect(formatIndicatorValue(52, 'percent', 1)).toBe('52.0%');
    expect(formatIndicatorValue(116136, 'inr', 0)).toBe('₹1,16,136');
    expect(formatIndicatorValue(980, 'females_per_1000_males', 0)).toBe('980 per 1,000 men');
    expect(formatIndicatorValue(12628, 'kg_per_day', 0)).toBe('12,628 kg/day');
  });

  /**
   * These two used to fall through to the default branch and print their raw unit key —
   * "67 index" and "2 rank" both shipped to the district pages.
   */
  it('does not append a unit word to an index or a rank', () => {
    expect(formatIndicatorValue(67, 'index', 0)).toBe('67');
    // A rank is a position, not a quantity of ranks.
    expect(formatIndicatorValue(2, 'rank', 0)).toBe('#2');
  });

  it('falls back to the raw unit for anything unrecognised', () => {
    // Deliberate: a new unit shows up visibly wrong rather than silently unlabelled.
    expect(formatIndicatorValue(5, 'furlongs', 0)).toBe('5 furlongs');
  });
});
