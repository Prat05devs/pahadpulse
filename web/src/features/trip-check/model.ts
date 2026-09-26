import type { Alert } from '@/features/alerts/schemas';
import type { TourismGuide } from '@/features/tourism/pilgrim-schemas';

/**
 * Pure logic for the trip check. It never says whether a trip is safe: it resolves where the
 * traveller is going, which day, and how official signals relate to that day. Every label it
 * produces is either an official definition (IMD rainfall intensity) or a plain statement
 * of fact about a warning's validity.
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

export interface DestinationGroup {
  label: string;
  options: { value: string; label: string }[];
}

/** `YYYY-MM-DD` for the given instant, on the Indian calendar. */
export function istDate(now: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(now);
}

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** Today plus the next six days: the window the district forecast covers. */
export function travelDateOptions(now: Date): { value: string; label: string }[] {
  const today = istDate(now);
  return Array.from({ length: FORECAST_DAYS }, (_, offset) => {
    const value = addDays(today, offset);
    const day = new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00Z`));
    const prefix = offset === 0 ? 'Today · ' : offset === 1 ? 'Tomorrow · ' : '';
    return { value, label: `${prefix}${day}` };
  });
}

/** A requested date is honoured only inside the forecast window; anything else means today. */
export function normaliseTravelDate(requested: string | undefined, now: Date): string {
  const options = travelDateOptions(now);
  return options.some((option) => option.value === requested)
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

export function destinationGroups(
  guide: TourismGuide | null,
  districts: readonly DistrictRef[]
): DestinationGroup[] {
  const groups: DestinationGroup[] = [];
  if (guide !== null) {
    const seen = new Set<string>();
    const toOptions = (places: readonly GuidePlace[]) =>
      places
        .filter((place) => {
          if (seen.has(place.slug)) return false;
          seen.add(place.slug);
          return true;
        })
        .map((place) => ({ value: place.slug, label: `${place.name} (${place.district})` }));
    groups.push(
      { label: 'Char Dham', options: toOptions(guide.charDham) },
      { label: 'Pilgrimage places', options: toOptions(guide.pilgrimages) },
      { label: 'Destinations', options: toOptions(guide.destinations) }
    );
  }
  groups.push({
    label: 'Districts',
    options: districts.map((district) => ({
      value: district.slug,
      label: `${district.name} district`,
    })),
  });
  return groups.filter((group) => group.options.length > 0);
}

export type RainfallLevel =
  'none' | 'very_light' | 'light' | 'moderate' | 'heavy' | 'very_heavy' | 'extremely_heavy';

/**
 * India Meteorological Department terminology for 24-hour rainfall. These are IMD's own
 * intensity definitions, applied to a forecast figure; they describe the amount, not risk.
 */
export function rainfallCategory(
  mm: number | null
): { level: RainfallLevel; label: string } | null {
  if (mm === null) return null;
  if (mm < 0.1) return { level: 'none', label: 'No rain' };
  if (mm < 2.5) return { level: 'very_light', label: 'Very light rain' };
  if (mm < 15.6) return { level: 'light', label: 'Light rain' };
  if (mm < 64.5) return { level: 'moderate', label: 'Moderate rain' };
  if (mm < 115.6) return { level: 'heavy', label: 'Heavy rain' };
  if (mm < 204.5) return { level: 'very_heavy', label: 'Very heavy rain' };
  return { level: 'extremely_heavy', label: 'Extremely heavy rain' };
}

/**
 * The API sends UTC as `YYYY-MM-DD HH:mm:ss` with no zone marker. Parse it as UTC, and
 * accept an ISO string with its own zone unchanged.
 */
export function parseUtc(value: string): Date {
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
  if (alert.expiresAt !== null && parseUtc(alert.expiresAt) <= dayStart) return 'ends-before-date';
  if (alert.effectiveFrom !== null && parseUtc(alert.effectiveFrom) >= dayEnd) {
    return 'starts-after-date';
  }
  return 'covers-date';
}
