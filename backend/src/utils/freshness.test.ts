import { describe, expect, it } from '@jest/globals';

import { Cadence, Freshness } from '../types/dataset.js';
import { freshnessOf, secondsUntilStale } from './freshness.js';

const NOW = new Date('2026-09-03T12:00:00.000Z');

/** Minutes/hours/days before NOW, as a Date. */
function ago(seconds: number): Date {
  return new Date(NOW.getTime() - seconds * 1000);
}

const HOUR = 3600;
const DAY = 24 * HOUR;

describe('freshnessOf', () => {
  it('reports unknown when there has never been a successful run', () => {
    // Distinct from "old": we have never had this data at all.
    expect(freshnessOf(Cadence.Daily, null, NOW)).toBe(Freshness.Unknown);
  });

  it('treats a static source as permanently fresh', () => {
    // A source that is not expected to change cannot be late.
    expect(freshnessOf(Cadence.Static, ago(50 * 365 * DAY), NOW)).toBe(Freshness.Fresh);
  });

  describe('daily cadence', () => {
    it('is fresh within one interval', () => {
      expect(freshnessOf(Cadence.Daily, ago(6 * HOUR), NOW)).toBe(Freshness.Fresh);
    });

    it('is fresh exactly at the interval boundary', () => {
      expect(freshnessOf(Cadence.Daily, ago(DAY), NOW)).toBe(Freshness.Fresh);
    });

    it('is stale just past the interval', () => {
      expect(freshnessOf(Cadence.Daily, ago(DAY + 1), NOW)).toBe(Freshness.Stale);
    });

    it('is stale up to the expiry multiple', () => {
      expect(freshnessOf(Cadence.Daily, ago(3 * DAY), NOW)).toBe(Freshness.Stale);
    });

    it('is expired past the expiry multiple', () => {
      expect(freshnessOf(Cadence.Daily, ago(3 * DAY + 1), NOW)).toBe(Freshness.Expired);
    });
  });

  describe('realtime cadence', () => {
    it('is fresh within fifteen minutes', () => {
      expect(freshnessOf(Cadence.Realtime, ago(10 * 60), NOW)).toBe(Freshness.Fresh);
    });

    it('is stale after twenty minutes', () => {
      expect(freshnessOf(Cadence.Realtime, ago(20 * 60), NOW)).toBe(Freshness.Stale);
    });

    it('is expired after an hour', () => {
      expect(freshnessOf(Cadence.Realtime, ago(HOUR), NOW)).toBe(Freshness.Expired);
    });
  });

  describe('annual cadence', () => {
    /** Census data is years old by nature; that is vintage, not staleness of our copy. */
    it('is fresh when fetched recently even though the data is old', () => {
      expect(freshnessOf(Cadence.Annual, ago(HOUR), NOW)).toBe(Freshness.Fresh);
    });

    it('is stale two years after the last successful fetch', () => {
      expect(freshnessOf(Cadence.Annual, ago(2 * 365 * DAY), NOW)).toBe(Freshness.Stale);
    });
  });

  it('does not report staleness for a future timestamp', () => {
    // Clock skew between us and an upstream is not a data problem.
    const future = new Date(NOW.getTime() + HOUR * 1000);
    expect(freshnessOf(Cadence.Daily, future, NOW)).toBe(Freshness.Fresh);
  });
});

describe('secondsUntilStale', () => {
  it('counts down within the interval', () => {
    expect(secondsUntilStale(Cadence.Daily, ago(6 * HOUR), NOW)).toBe(18 * HOUR);
  });

  it('is zero once already stale rather than negative', () => {
    expect(secondsUntilStale(Cadence.Daily, ago(3 * DAY), NOW)).toBe(0);
  });

  it('is null for a static source', () => {
    expect(secondsUntilStale(Cadence.Static, ago(DAY), NOW)).toBeNull();
  });

  it('is null when there has never been a successful run', () => {
    expect(secondsUntilStale(Cadence.Daily, null, NOW)).toBeNull();
  });
});
