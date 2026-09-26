import { describe, expect, it } from '@jest/globals';

import { fetchWindow, istDate } from './pwd-road-closures.connector.js';

const now = new Date('2026-09-26T04:00:00Z'); // 09:30 IST

describe('PWD road closure fetch window', () => {
  it('uses the Indian calendar for the dashboard filters', () => {
    expect(istDate(new Date('2026-09-25T19:00:00Z'))).toBe('2026-09-26');
  });

  it('reaches back half a year on the first run', () => {
    expect(fetchWindow(now, null)).toEqual({ from: '2026-03-30', to: '2026-09-26' });
  });

  it('always reaches the oldest road still closed, so its reopening is seen next poll', () => {
    // A landslide closure from 7 July must stay inside every fetch until it reopens.
    expect(fetchWindow(now, '2026-07-07 01:25:00').from).toBe('2026-07-06');
  });

  it('never fetches less than a week', () => {
    expect(fetchWindow(now, '2026-09-26 02:00:00').from).toBe('2026-09-19');
  });

  it('never reaches back more than a year', () => {
    expect(fetchWindow(now, '2024-01-01 00:00:00').from).toBe('2025-09-26');
  });
});
