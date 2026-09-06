import { describe, expect, it } from '@jest/globals';

import { toDateOnly, toIsoUtc, toMysqlUtcDatetime } from './datetime.js';

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

describe('toIsoUtc', () => {
  it('stamps the zone onto a naive column value', () => {
    // Without the Z a browser reads this as local time, which in India shifts every
    // displayed timestamp by five and a half hours.
    expect(toIsoUtc('2026-09-06 06:45:00')).toBe('2026-09-06T06:45:00.000Z');
  });

  it('round-trips with toMysqlUtcDatetime', () => {
    const stored = toMysqlUtcDatetime('2026-09-04T02:00:00+05:30');
    expect(stored).not.toBeNull();
    expect(toIsoUtc(stored)).toBe('2026-09-03T20:30:00.000Z');
  });

  it('leaves a value that already states its zone alone', () => {
    expect(toIsoUtc('2026-09-06T06:45:00Z')).toBe('2026-09-06T06:45:00.000Z');
    expect(toIsoUtc('2026-09-06T12:15:00+05:30')).toBe('2026-09-06T06:45:00.000Z');
  });

  it('returns null for null or unparseable input', () => {
    expect(toIsoUtc(null)).toBeNull();
    expect(toIsoUtc('not a date')).toBeNull();
  });
});
