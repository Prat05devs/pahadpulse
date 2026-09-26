import { describe, expect, it } from 'vitest';
import type { TourismGuide } from '@/features/tourism/pilgrim-schemas';
import {
  alertCoverage,
  destinationGroups,
  istDate,
  normaliseTravelDate,
  rainfallCategory,
  resolveDestination,
  travelDateOptions,
} from './model';

const place = (slug: string, name: string, district: string) => ({
  slug,
  name,
  district,
  imageUrl: 'https://example.org/i.jpg',
  officialUrl: 'https://example.org',
  mapDestination: name,
  lat: 30,
  lng: 79,
});

const guide: TourismGuide = {
  verifiedOn: '2026-09-25',
  sourceUrl: 'https://example.org',
  charDham: [
    {
      ...place('kedarnath', 'Kedarnath', 'Rudraprayag'),
      nameHi: 'केदारनाथ',
      altitudeM: 3584,
      bestSeason: 'May to June',
      access: 'Trek from Gaurikund',
      imageAlt: 'Kedarnath',
    },
  ],
  pilgrimages: [{ ...place('haridwar', 'Haridwar', 'Haridwar'), category: 'Ghat', summary: '' }],
  destinations: [
    { ...place('auli', 'Auli', 'Chamoli'), category: 'Ski', summary: '' },
    { ...place('haridwar', 'Haridwar', 'Haridwar'), category: 'City', summary: '' },
  ],
  officialLinks: [],
  guidelines: [],
  helplines: { yatra: ['1364'], emergency: '112' },
};

const districts = [
  { slug: 'rudraprayag', name: 'Rudraprayag' },
  { slug: 'haridwar', name: 'Haridwar' },
  { slug: 'chamoli', name: 'Chamoli' },
];

describe('trip check dates', () => {
  it('uses the Indian calendar date, not UTC', () => {
    // 20:00 UTC on the 25th is already 01:30 on the 26th in India.
    expect(istDate(new Date('2026-09-25T20:00:00Z'))).toBe('2026-09-26');
  });

  it('offers today and the next six days, labelled for people', () => {
    const options = travelDateOptions(new Date('2026-09-26T03:00:00Z'));
    expect(options).toHaveLength(7);
    expect(options[0]).toEqual({ value: '2026-09-26', label: 'Today · Sat, 26 Sept' });
    expect(options[1]?.label.startsWith('Tomorrow · ')).toBe(true);
    expect(options[6]?.value).toBe('2026-10-02');
  });

  it('falls back to today for a date outside the forecast window', () => {
    const now = new Date('2026-09-26T03:00:00Z');
    expect(normaliseTravelDate('2026-09-28', now)).toBe('2026-09-28');
    expect(normaliseTravelDate('2026-12-01', now)).toBe('2026-09-26');
    expect(normaliseTravelDate('not-a-date', now)).toBe('2026-09-26');
    expect(normaliseTravelDate(undefined, now)).toBe('2026-09-26');
  });
});

describe('trip check destinations', () => {
  it('maps a guide place to the district it sits in', () => {
    const destination = resolveDestination('kedarnath', guide, districts);
    expect(destination?.kind).toBe('place');
    expect(destination?.district.slug).toBe('rudraprayag');
  });

  it('prefers the place when a place and a district share a slug', () => {
    expect(resolveDestination('haridwar', guide, districts)?.kind).toBe('place');
  });

  it('resolves a bare district, and rejects unknown slugs', () => {
    expect(resolveDestination('chamoli', guide, districts)).toMatchObject({
      kind: 'district',
      name: 'Chamoli',
    });
    expect(resolveDestination('atlantis', guide, districts)).toBeNull();
    expect(resolveDestination(undefined, guide, districts)).toBeNull();
  });

  it('still offers districts when the guide is unavailable, listing each place once', () => {
    expect(destinationGroups(null, districts).map((group) => group.label)).toEqual(['Districts']);
    const all = destinationGroups(guide, districts).flatMap((group) => group.options);
    expect(all.filter((option) => option.value === 'haridwar')).toHaveLength(2); // place + district
  });
});

describe('IMD rainfall categories', () => {
  it.each([
    [null, null],
    [0, 'No rain'],
    [2.4, 'Very light rain'],
    [2.5, 'Light rain'],
    [15.6, 'Moderate rain'],
    [61, 'Moderate rain'],
    [64.5, 'Heavy rain'],
    [115.6, 'Very heavy rain'],
    [204.5, 'Extremely heavy rain'],
  ])('%s mm is %s', (mm, label) => {
    expect(rainfallCategory(mm)?.label ?? null).toBe(label);
  });
});

describe('alert coverage of the travel date', () => {
  it('reads API times as UTC and compares against the Indian day', () => {
    // Expires 18:29 UTC on the 26th = 23:59 IST on the 26th: still covers the 26th.
    expect(
      alertCoverage({ effectiveFrom: null, expiresAt: '2026-09-26 18:29:00' }, '2026-09-26')
    ).toBe('covers-date');
    // Expires 18:30 UTC on the 26th = midnight IST: over before the 27th begins.
    expect(
      alertCoverage({ effectiveFrom: null, expiresAt: '2026-09-26 18:30:00' }, '2026-09-27')
    ).toBe('ends-before-date');
  });

  it('treats a warning with no expiry as covering the date', () => {
    expect(alertCoverage({ effectiveFrom: null, expiresAt: null }, '2026-10-01')).toBe(
      'covers-date'
    );
  });

  it('notices a warning that only takes effect after the travel date', () => {
    expect(
      alertCoverage({ effectiveFrom: '2026-09-28 00:00:00', expiresAt: null }, '2026-09-26')
    ).toBe('starts-after-date');
  });
});
