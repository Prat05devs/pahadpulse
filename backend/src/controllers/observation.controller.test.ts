import { describe, expect, it } from '@jest/globals';

import { forecastDateKey } from './observation.controller.js';

describe('forecastDateKey', () => {
  /**
   * Regression: `valid_from` is stored in UTC and an IST day starts at 18:30 UTC the
   * previous day, so taking the UTC date directly labelled every forecast day one day
   * early — the API served "2026-09-05" for the day Open-Meteo forecast as the 6th.
   */
  it('labels a local day by its own date, not the UTC date it starts on', () => {
    // Midnight IST on 6 September is 18:30 UTC on the 5th.
    expect(forecastDateKey('2026-09-05T18:30:00.000Z')).toBe('2026-09-06');
  });

  it('holds the same label across the whole local day', () => {
    // Just before local midnight closes the day: 18:29 UTC on the 6th is 23:59 IST.
    expect(forecastDateKey('2026-09-06T18:29:00.000Z')).toBe('2026-09-06');
  });

  it('rolls over to the next date at local midnight', () => {
    expect(forecastDateKey('2026-09-06T18:30:00.000Z')).toBe('2026-09-07');
  });

  it('handles a month boundary', () => {
    expect(forecastDateKey('2026-08-31T18:30:00.000Z')).toBe('2026-09-01');
  });
});
