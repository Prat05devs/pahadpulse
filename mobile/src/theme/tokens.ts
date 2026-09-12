import type { FontWeightToken } from './fonts';

/**
 * Design tokens. The ONLY place a raw colour, spacing step or font size is written down.
 *
 * Components must never hard-code `#015BD6` or `padding: 13`. They read from here through
 * `useTheme()`, which is what makes a palette change one edit instead of a hundred.
 *
 * The brand values are sampled from the Pahad Pulse logo itself (mountain, river, road,
 * pulse), so the app and the mark cannot drift apart.
 */

/** Brand constants. Identical in light and dark — a brand colour does not change theme. */
export const brand = {
  /** The mountain. Primary action and identity colour. */
  blue: '#015BD6',
  /** The river. Secondary accent, used for water and hydromet data. */
  cyan: '#01BAFE',
  /** The pulse. Reserved for live/urgent signals — never decorative. */
  red: '#FD1C1D',
  /** The road. */
  ink: '#2B2B2C',
} as const;

/** Mirrors the API's `severity` enum. */
export type Severity = 'minor' | 'moderate' | 'severe' | 'extreme' | 'unknown';

/** Mirrors the API's `freshness` enum. */
export type FreshnessLevel = 'fresh' | 'stale' | 'expired' | 'unknown';

/**
 * Severity colours, matching the API's `severity` enum exactly.
 *
 * These are data encodings, not decoration: an "extreme" alert must look the same on every
 * screen, so the mapping lives here rather than inside whichever component draws it first.
 */
const severity: Record<Severity, string> = {
  minor: '#0F8A4C',
  moderate: '#B7791F',
  severe: '#D9480F',
  extreme: '#C1121F',
  unknown: '#6B7280',
};

/**
 * Freshness colours, matching the API's `freshness` enum.
 *
 * Provenance is the platform's core promise, so how fresh a figure is gets a token of its
 * own rather than being borrowed from the severity scale.
 */
const freshness: Record<FreshnessLevel, string> = {
  fresh: '#0F8A4C',
  stale: '#B7791F',
  expired: '#C1121F',
  unknown: '#6B7280',
} as const;

/**
 * The palette contract. Written out as a type rather than inferred from the light values,
 * so `darkColors` is checked against the same shape instead of against light's literal
 * strings — and so a new token cannot be added to one theme and forgotten in the other.
 */
export type Colors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;

  text: string;
  textMuted: string;
  textInverse: string;

  primary: string;
  primaryMuted: string;
  accent: string;
  accentMuted: string;
  danger: string;
  dangerMuted: string;

  severity: Record<Severity, string>;
  freshness: Record<FreshnessLevel, string>;

  scrim: string;
  skeleton: string;
};

const lightColors: Colors = {
  /** Page background, behind everything. */
  background: '#F3F5FA',
  /** Raised surfaces: cards, sheets, the tab bar. */
  surface: '#FFFFFF',
  /** A surface one step further back, for nested blocks and table stripes. */
  surfaceMuted: '#ECF0F8',
  border: '#D6DCE8',
  borderStrong: '#BDC6D6',

  text: '#0F172A',
  textMuted: '#475569',
  textInverse: '#FFFFFF',

  primary: brand.blue,
  primaryMuted: '#DBEAFE',
  accent: brand.cyan,
  accentMuted: '#CCEFFE',
  danger: brand.red,
  dangerMuted: '#FDE2E2',

  severity,
  freshness,

  /** Overlay behind modals and sheets. */
  scrim: 'rgba(15, 23, 42, 0.5)',
  /** Skeleton placeholder fill. */
  skeleton: '#E2E8F0',
};

/**
 * Dark values, keyed identically to light so `Colors` has one shape.
 *
 * Surfaces get lighter as they come forward, which is the inverse of the light theme — a
 * dark card on a dark page reads as a hole rather than a card.
 */
const darkColors: Colors = {
  background: '#0C1222',
  surface: '#162033',
  surfaceMuted: '#1E2D44',
  border: '#2A3A52',
  borderStrong: '#3D506A',

  text: '#F1F5F9',
  textMuted: '#94A3B8',
  textInverse: '#0C1222',

  primary: '#60A5FA',
  primaryMuted: '#172554',
  accent: '#38BDF8',
  accentMuted: '#0C3547',
  danger: '#FB7185',
  dangerMuted: '#3B1520',

  severity: {
    minor: '#4ADE80',
    moderate: '#FBBF24',
    severe: '#FB923C',
    extreme: '#FB7185',
    unknown: '#94A3B8',
  },
  freshness: {
    fresh: '#4ADE80',
    stale: '#FBBF24',
    expired: '#FB7185',
    unknown: '#94A3B8',
  },

  scrim: 'rgba(0, 0, 0, 0.65)',
  skeleton: '#1E293B',
};

export const palettes = { light: lightColors, dark: darkColors } as const;

export type ColorScheme = keyof typeof palettes;

/**
 * A 4pt spacing scale. Named by step, not by pixel value, so the rhythm can be retuned
 * globally without touching call sites.
 */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export type SpacingToken = keyof typeof spacing;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;

/**
 * The type ramp.
 *
 * Each step names a WEIGHT TOKEN, not a `fontWeight` number. The `Text` atom resolves that
 * token to a concrete font family — see `theme/fonts.ts` for why numeric weights cannot be
 * used with a bundled font on Android.
 *
 * `lineHeight` is absolute because React Native rejects unitless multipliers, and letting
 * each component compute its own is how baselines drift between screens.
 */
export const typography = {
  display: { fontSize: 32, lineHeight: 40, weight: 'bold' },
  title: { fontSize: 22, lineHeight: 30, weight: 'bold' },
  heading: { fontSize: 17, lineHeight: 24, weight: 'semibold' },
  body: { fontSize: 15, lineHeight: 22, weight: 'regular' },
  bodyStrong: { fontSize: 15, lineHeight: 22, weight: 'semibold' },
  caption: { fontSize: 13, lineHeight: 18, weight: 'regular' },
  /** For source lines and timestamps — the smallest size we allow. */
  footnote: { fontSize: 11, lineHeight: 16, weight: 'medium' },
  /** Figures. Tabular so digits do not jitter as values refresh. */
  metric: { fontSize: 26, lineHeight: 32, weight: 'bold' },
} as const satisfies Record<string, { fontSize: number; lineHeight: number; weight: FontWeightToken }>;

export type TypographyToken = keyof typeof typography;

/**
 * Elevation. iOS reads shadows, Android reads `elevation`; both are set so a card looks
 * raised on either platform without a `Platform.select` at every call site.
 */
export const elevation = {
  none: {},
  low: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

export type ElevationToken = keyof typeof elevation;

/** Minimum touch target. Below this, a control fails accessibility review on both platforms. */
export const HIT_SLOP_MIN_SIZE = 44;
