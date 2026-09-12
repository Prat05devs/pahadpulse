import type { LocalisedText } from '@/types/api';
import type { Language } from '@/stores';

/**
 * Presentation helpers. Pure functions only — nothing here touches state or the network, so
 * every one of them is trivially testable.
 */

/**
 * Pick the reader's language, falling back to the other one rather than to an empty string.
 *
 * Hindi coverage is uneven across sources: some departments publish English names only. A
 * reader who chose Hindi is far better served by an English district name than by a blank.
 */
export function localise(text: LocalisedText | null | undefined, language: Language): string {
  if (!text) return '';
  const preferred = text[language];
  if (preferred && preferred.trim().length > 0) return preferred;
  const fallback = language === 'en' ? text.hi : text.en;
  return fallback ?? '';
}

/**
 * Format a figure for display in Indian digit grouping (1,23,456 rather than 123,456).
 *
 * The audience is Indian, and lakh/crore grouping is what a population figure is expected to
 * look like here. `en-IN` gives that grouping without us hand-rolling it.
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Compact form for large figures, in Indian units.
 *
 * A district card has room for "10.9 L", not "10,86,346". The full figure stays available on
 * the detail screen — this is for the card, never for the page that cites a source.
 */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${(value / 1e7).toFixed(abs >= 1e8 ? 0 : 1)} Cr`;
  if (abs >= 1e5) return `${(value / 1e5).toFixed(abs >= 1e6 ? 0 : 1)} L`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(abs >= 1e4 ? 0 : 1)} K`;
  return formatNumber(value, Number.isInteger(value) ? 0 : 1);
}

/**
 * Parse the API's `YYYY-MM-DD HH:mm:ss` UTC timestamps.
 *
 * `new Date('2026-09-10 04:30:00')` is not portable: some engines read it as local time and
 * some reject it outright. Replacing the space with `T` and appending `Z` states the zone
 * explicitly, which is the difference between a correct "2 hours ago" and one that is
 * 5½ hours out for every reader in India.
 */
export function parseUtc(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalised = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalised);
  return Number.isNaN(date.getTime()) ? null : date;
}

type RelativeUnit = 'year' | 'month' | 'day' | 'hour' | 'minute';

const RELATIVE_UNITS: [RelativeUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/**
 * The words `numeric: 'auto'` produces for a single unit, as [past, future].
 *
 * Only day/month/year have them: 'auto' has no special word for one hour or one minute, so
 * those fall through to the plain "1 hour ago" form.
 */
const RELATIVE_AUTO: Partial<Record<RelativeUnit, readonly [string, string]>> = {
  day: ['yesterday', 'tomorrow'],
  month: ['last month', 'next month'],
  year: ['last year', 'next year'],
};

/**
 * "3 hours ago". Used for how recently a reading was fetched.
 *
 * Hand-rolled rather than `Intl.RelativeTimeFormat`, which Hermes does not implement. On
 * device the constructor is `undefined`, so `new Intl.RelativeTimeFormat(...)` threw
 * "undefined cannot be used as a constructor" and took down every screen that renders a
 * source note — which is nearly all of them. `Intl.NumberFormat` and `Intl.DateTimeFormat`
 * elsewhere in this file are fine: Hermes backs those with the platform's ICU.
 *
 * A polyfill (@formatjs/intl-relativetimeformat) would restore the API, but it pulls locale
 * data into the bundle to render the handful of English strings below, and adding a
 * dependency is a deliberate decision here (N10).
 */
export function formatRelative(value: string | Date | null | undefined): string {
  const date = value instanceof Date ? value : parseUtc(value);
  if (!date) return '';

  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  if (abs < 60 * 1000) return 'just now';

  const isFuture = diff > 0;
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (abs < ms) continue;
    const amount = Math.round(abs / ms);
    if (amount === 1) {
      const auto = RELATIVE_AUTO[unit];
      if (auto) return isFuture ? auto[1] : auto[0];
    }
    const noun = amount === 1 ? unit : `${unit}s`;
    return isFuture ? `in ${amount} ${noun}` : `${amount} ${noun} ago`;
  }
  return 'just now';
}

/** "10 Sep 2026" — for a vintage, where the exact day matters and "2 years ago" does not. */
export function formatDate(value: string | Date | null | undefined): string {
  const date =
    value instanceof Date
      ? value
      : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00Z`)
        : parseUtc(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

/** "4:30 pm" in IST — the zone every reader of this app is in. */
export function formatTime(value: string | Date | null | undefined): string {
  const date = value instanceof Date ? value : parseUtc(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

/**
 * Render a value with its unit.
 *
 * The web app shipped a bug where raw unit keys like `deg_c` printed straight onto district
 * pages. The mapping lives here so both the fix and any future unit are in one place.
 */
const UNIT_LABELS: Record<string, string> = {
  deg_c: '°C',
  celsius: '°C',
  mm: ' mm',
  m: ' m',
  cumec: ' m³/s',
  percent: '%',
  pct: '%',
  kmph: ' km/h',
  km_h: ' km/h',
  mps: ' m/s',
  count: '',
  number: '',
  ratio: '',
  per_1000: ' per 1,000',
  per_100000: ' per 1,00,000',
  inr: ' ₹',
  km: ' km',
  sq_km: ' km²',
  mbps: ' Mbps',
  ms: ' ms',
};

export function formatUnit(value: number, unit: string | null | undefined, decimals = 0): string {
  const number = formatNumber(value, decimals);
  if (!unit) return number;
  const label = UNIT_LABELS[unit.toLowerCase()];
  // An unmapped unit is shown with a space rather than dropped: a wrong-looking label is a
  // visible bug someone will report, whereas a silently missing one is never noticed.
  return label === undefined ? `${number} ${unit}` : `${number}${label}`;
}

/** Sentence-case a slug or enum value for display: `partly_cloudy` -> `Partly cloudy`. */
export function humanise(value: string): string {
  const spaced = value.replace(/[_-]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}
