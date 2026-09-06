import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from '@jest/globals';

import { localToUtc, parseOpenMeteoResponse } from './open-meteo.parser.js';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '__tests__',
  'fixtures',
);

function fixture(name: string): string {
  return readFileSync(path.join(fixturesDir, name), 'utf8');
}

const dehradunJson = fixture('open-meteo-dehradun.sample.json');

describe('parseOpenMeteoResponse', () => {
  it('reads a live Dehradun response fixture', () => {
    const result = parseOpenMeteoResponse(dehradunJson);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value.current?.temperature_2m).toEqual(expect.any(Number));
    expect(result.value.daily?.time.length).toBeGreaterThan(0);
    // IST. The connector relies on this to correct the local timestamps.
    expect(result.value.utc_offset_seconds).toBe(19800);
  });

  it('rejects a body that is not JSON', () => {
    const result = parseOpenMeteoResponse('<html>502 Bad Gateway</html>');

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe(90003);
  });

  it('rejects a response missing the offset the timestamps depend on', () => {
    const result = parseOpenMeteoResponse(JSON.stringify({ latitude: 30, longitude: 78 }));

    expect(result.isErr()).toBe(true);
  });

  it('ignores unknown fields so an upstream addition does not fail a run', () => {
    const result = parseOpenMeteoResponse(
      JSON.stringify({
        latitude: 30,
        longitude: 78,
        utc_offset_seconds: 19800,
        some_new_field: 'added next year',
        current: { time: '2026-09-06T12:15', temperature_2m: 25 },
      }),
    );

    expect(result.isOk()).toBe(true);
  });

  it('keeps a null measurement as null rather than coercing it to zero', () => {
    const result = parseOpenMeteoResponse(
      JSON.stringify({
        latitude: 30,
        longitude: 78,
        utc_offset_seconds: 19800,
        current: { time: '2026-09-06T12:15', temperature_2m: null },
      }),
    );

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.current?.temperature_2m).toBeNull();
  });
});

describe('localToUtc', () => {
  it('subtracts the IST offset from a local timestamp', () => {
    // 12:15 IST is 06:45 UTC. Getting this wrong is a five-and-a-half-hour error that
    // still looks like a plausible time, which is why it is asserted explicitly.
    expect(localToUtc('2026-09-06T12:15', 19800)).toBe('2026-09-06 06:45:00');
  });

  it('treats a bare date as local midnight', () => {
    expect(localToUtc('2026-09-06', 19800)).toBe('2026-09-05 18:30:00');
  });

  it('accepts a timestamp that already carries seconds', () => {
    expect(localToUtc('2026-09-06T12:15:30', 19800)).toBe('2026-09-06 06:45:30');
  });

  it('is a no-op at UTC', () => {
    expect(localToUtc('2026-09-06T12:15', 0)).toBe('2026-09-06 12:15:00');
  });

  it('handles a negative offset', () => {
    expect(localToUtc('2026-09-06T12:15', -18000)).toBe('2026-09-06 17:15:00');
  });

  it('returns null rather than a fabricated timestamp', () => {
    expect(localToUtc('not a date', 19800)).toBeNull();
  });
});
