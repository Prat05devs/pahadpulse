import { describe, expect, it } from '@jest/globals';

import { toDateOnly, toMysqlUtcDatetime } from './datetime.js';

describe('toMysqlUtcDatetime', () => {
  it('converts an IST offset to UTC', () => {
    // CAP's real sent timestamp shape: '2026-09-03T12:51:21+05:30' -> 07:21:21 UTC.
    expect(toMysqlUtcDatetime('2026-09-03T12:51:21+05:30')).toBe('2026-09-03 07:21:21');
  });

  it('passes a UTC-Z timestamp through unchanged in value', () => {
    expect(toMysqlUtcDatetime('2026-09-03T07:21:21.000Z')).toBe('2026-09-03 07:21:21');
  });

  it('handles a day rollover across the offset boundary', () => {
    expect(toMysqlUtcDatetime('2026-09-04T02:00:00+05:30')).toBe('2026-09-03 20:30:00');
  });

  it('returns null for null input', () => {
    expect(toMysqlUtcDatetime(null)).toBeNull();
  });

  it('returns null for unparseable input rather than a fabricated date', () => {
    expect(toMysqlUtcDatetime('not a date')).toBeNull();
    expect(toMysqlUtcDatetime('')).toBeNull();
  });
});

describe('toDateOnly', () => {
  it('takes just the date portion, in UTC', () => {
    expect(toDateOnly('2026-09-04T02:00:00+05:30')).toBe('2026-09-03');
  });

  it('returns null for unparseable input', () => {
    expect(toDateOnly('garbage')).toBeNull();
  });
});
