import type { Alert } from '@/features/alerts';
import type { TourismGuide } from '@/features/tourism';
import type { TranslationKey } from '@/i18n';

/**
 * Pure logic for the trip check, ported from `web/src/features/trip-check/model.ts`.
 *
 * It never says whether a trip is safe: it resolves where the traveller is going, which day,
 * and how official signals relate to that day. Every label is either an official definition
 * (IMD rainfall intensity) or a plain statement of fact about a warning's validity. Labels are
 * translation keys here, where the web returns English.
 */

export const FORECAST_DAYS = 7;
const IST = 'Asia/Kolkata';

export interface DistrictRef {
  slug: string;
  name: string;
}

export type GuidePlace =
  | TourismGuide['charDham'][number]
  | TourismGuide['pilgrimages'][number]
  | TourismGuide['destinations'][number];

export type Destination =
  | { kind: 'place'; slug: string; name: string; district: DistrictRef; place: GuidePlace }
  | { kind: 'district'; slug: string; name: string; district: DistrictRef };

/** `YYYY-MM-DD` for the given instant, on the Indian calendar. */
export function istDate(now: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(now);
}

export function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** Today plus the next six days: the window the district forecast covers. */
export function travelDates(now: Date): { value: string; offset: number }[] {
  const today = istDate(now);
  return Array.from({ length: FORECAST_DAYS }, (_, offset) => ({
    value: addDays(today, offset),
    offset,
  }));
}

/** "Sat 26 Sep" - a travel date for a chip. */
export function shortDateLabel(date: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

/** A requested date is honoured only inside the forecast window; anything else means today. */
export function normaliseTravelDate(requested: string | undefined, now: Date): string {
  return travelDates(now).some((option) => option.value === requested)
    ? (requested as string)
    : istDate(now);
}

/** Every guide place, each slug once, in the order the guide lists them. */
function guidePlaces(guide: TourismGuide): GuidePlace[] {
  const seen = new Set<string>();
  return [...guide.charDham, ...guide.pilgrimages, ...guide.destinations].filter((place) => {
    if (seen.has(place.slug)) return false;
    seen.add(place.slug);
    return true;
  });
}

/**
 * A place slug wins over a district slug of the same name (Haridwar, Nainital): the place is
 * the more specific answer, and it sits in that same district anyway.
 */
export function resolveDestination(
  to: string | undefined,
  guide: TourismGuide | null,
  districts: readonly DistrictRef[]
): Destination | null {
  if (to === undefined || to === '') return null;

  const place = guide === null ? undefined : guidePlaces(guide).find((p) => p.slug === to);
  if (place !== undefined) {
    const district = districts.find((d) => d.name === place.district);
    if (district === undefined) return null;
    return { kind: 'place', slug: place.slug, name: place.name, district, place };
  }

  const district = districts.find((d) => d.slug === to);
  if (district === undefined) return null;
  return { kind: 'district', slug: district.slug, name: district.name, district };
}

export interface DestinationOption {
  value: string;
  label: string;
  description: string;
  group: TranslationKey;
}

/** Char Dham, then pilgrimage places, then destinations, then every district. */
export function destinationOptions(
  guide: TourismGuide | null,
  districts: readonly DistrictRef[]
): DestinationOption[] {
  const options: DestinationOption[] = [];
  if (guide !== null) {
    const seen = new Set<string>();
    const add = (places: readonly GuidePlace[], group: TranslationKey) => {
      for (const place of places) {
        if (seen.has(place.slug)) continue;
        seen.add(place.slug);
        options.push({
          value: place.slug,
          label: place.name,
          description: place.district,
          group,
        });
      }
    };
    add(guide.charDham, 'trip.group.charDham');
    add(guide.pilgrimages, 'trip.group.pilgrimages');
    add(guide.destinations, 'trip.group.destinations');
  }
  for (const district of districts) {
    options.push({
      value: district.slug,
      label: district.name,
      description: '',
      group: 'trip.group.districts',
    });
  }
  return options;
}

export type RainfallLevel =
  'none' | 'very_light' | 'light' | 'moderate' | 'heavy' | 'very_heavy' | 'extremely_heavy';

const RAIN_LABEL: Record<RainfallLevel, TranslationKey> = {
  none: 'trip.rain.none',
  very_light: 'trip.rain.veryLight',
  light: 'trip.rain.light',
  moderate: 'trip.rain.moderate',
  heavy: 'trip.rain.heavy',
  very_heavy: 'trip.rain.veryHeavy',
  extremely_heavy: 'trip.rain.extremelyHeavy',
};

/**
 * India Meteorological Department terminology for 24-hour rainfall. These are IMD's own
 * intensity definitions, applied to a forecast figure; they describe the amount, not risk.
 */
export function rainfallCategory(
  mm: number | null | undefined
): { level: RainfallLevel; label: TranslationKey } | null {
  if (mm === null || mm === undefined) return null;
  const level: RainfallLevel =
    mm < 0.1
      ? 'none'
      : mm < 2.5
        ? 'very_light'
        : mm < 15.6
          ? 'light'
          : mm < 64.5
            ? 'moderate'
            : mm < 115.6
              ? 'heavy'
              : mm < 204.5
                ? 'very_heavy'
                : 'extremely_heavy';
  return { level, label: RAIN_LABEL[level] };
}

export const HEAVY_RAIN_LEVELS: ReadonlySet<RainfallLevel> = new Set([
  'heavy',
  'very_heavy',
  'extremely_heavy',
]);

/**
 * The API sends UTC as `YYYY-MM-DD HH:mm:ss` with no zone marker. Parse it as UTC, and
 * accept an ISO string with its own zone unchanged.
 */
function parseUtc(value: string): Date {
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(value)) return new Date(value);
  return new Date(`${value.replace(' ', 'T')}Z`);
}

export type AlertCoverage = 'covers-date' | 'ends-before-date' | 'starts-after-date';

/** Whether a warning in force now is still valid on the travel date, from its own times. */
export function alertCoverage(
  alert: Pick<Alert, 'effectiveFrom' | 'expiresAt'>,
  travelDate: string
): AlertCoverage {
  const dayStart = new Date(`${travelDate}T00:00:00+05:30`);
  const dayEnd = new Date(`${addDays(travelDate, 1)}T00:00:00+05:30`);
  if (alert.expiresAt !== null && parseUtc(alert.expiresAt) <= dayStart)
    return 'ends-before-date';
  if (alert.effectiveFrom !== null && parseUtc(alert.effectiveFrom) >= dayEnd) {
    return 'starts-after-date';
  }
  return 'covers-date';
}
