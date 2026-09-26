import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from '@jest/globals';

import {
  istToUtc,
  normaliseStatus,
  parseRoadClosures,
  resolveDistrict,
} from './pwd-road-closures.parser.js';

const fixture = readFileSync(
  fileURLToPath(
    new URL('../../../__tests__/fixtures/pwd-road-closures.sample.html', import.meta.url),
  ),
  'utf8',
);

const districts = [
  { id: 1, nameEn: 'Almora' },
  { id: 7, nameEn: 'Nainital' },
  { id: 8, nameEn: 'Pauri Garhwal' },
  { id: 11, nameEn: 'Tehri Garhwal' },
  { id: 12, nameEn: 'Udham Singh Nagar' },
];

describe('PWD road closure parser', () => {
  it('reads every row of the real dashboard table', () => {
    const parsed = parseRoadClosures(fixture)._unsafeUnwrap();
    expect(parsed.rejected).toBe(0);
    expect(parsed.closures).toHaveLength(8);

    const first = parsed.closures[0];
    expect(first).toMatchObject({
      pwdRoadId: 10478,
      roadName: 'Tarikhet to Pipali Motor Road',
      status: 'closed',
      districtRaw: 'Almora',
      roadType: 'VR',
      department: 'PMGSY',
      // Of km 3, 4, 5, 7 and 8, only 7 is highlighted as blocked now.
      kmMarkers: '7',
      // 08:58 IST is 03:28 UTC.
      closedAt: '2026-09-26 03:28:00',
    });
    expect(first?.sourceClosureKey).toBe('10478@2026-09-26 03:28:00');
  });

  it('covers every status the dashboard uses', () => {
    const statuses = new Set(
      parseRoadClosures(fixture)
        ._unsafeUnwrap()
        .closures.map((c) => c.status),
    );
    expect(statuses).toEqual(new Set(['closed', 'open', 'partially_opened']));
  });

  it('never extracts the "Informed By" personal data', () => {
    const serialised = JSON.stringify(parseRoadClosures(fixture)._unsafeUnwrap());
    expect(serialised).not.toContain('REDACTED');
    expect(serialised.toLowerCase()).not.toContain('informed');
  });

  it('fails loudly when the table layout changes, rather than misreading columns', () => {
    const renamed = fixture.replace(/Road Closed at/g, 'Closure Time');
    expect(parseRoadClosures(renamed).isErr()).toBe(true);
    expect(parseRoadClosures('<html><body>Maintenance</body></html>').isErr()).toBe(true);
  });

  it('keeps only the km markers PWD highlights as blocked', () => {
    const closures = parseRoadClosures(fixture)._unsafeUnwrap().closures;
    for (const closure of closures.filter((c) => c.status === 'open')) {
      expect(closure.kmMarkers).toBeNull();
    }
  });

  it('converts Indian Standard Time to UTC and rejects junk', () => {
    expect(istToUtc('2026-09-26 00:10')).toBe('2026-09-25 18:40:00');
    expect(istToUtc('26/09/2026')).toBeNull();
  });

  it('maps PWD status wording', () => {
    expect(normaliseStatus('Opened for Traffic')).toBe('open');
    expect(normaliseStatus('Partially Closed')).toBe('partially_closed');
    expect(normaliseStatus('Partially Opened')).toBe('partially_opened');
    expect(normaliseStatus('Closed')).toBe('closed');
    expect(normaliseStatus('???')).toBe('unknown');
  });

  it("resolves PWD's district spellings to ours, and nothing else", () => {
    expect(resolveDistrict('Nanital', districts)).toBe(7);
    expect(resolveDistrict('Pauri', districts)).toBe(8);
    expect(resolveDistrict('Tehri', districts)).toBe(11);
    expect(resolveDistrict('Udham Singh Nagar', districts)).toBe(12);
    expect(resolveDistrict('Almora', districts)).toBe(1);
    expect(resolveDistrict('Atlantis', districts)).toBeNull();
    expect(resolveDistrict(null, districts)).toBeNull();
  });
});
