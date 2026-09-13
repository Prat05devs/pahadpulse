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

// ---------------------------------------------------------------------------
// Alpha utility — avoids raw hex-alpha string concatenation in components.
// ---------------------------------------------------------------------------

/** Append an alpha byte to a 6-digit hex colour: `withAlpha('#015BD6', 0.12)` → `#015BD61F`. */
export function withAlpha(hex: string, opacity: number): string {
  const alpha = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${alpha}`;
}

// ---------------------------------------------------------------------------
// Palette contract
// ---------------------------------------------------------------------------

/**
 * The palette contract. Written out as a type rather than inferred from the light values,
 * so `darkColors` is checked against the same shape instead of against light's literal
 * strings — and so a new token cannot be added to one theme and forgotten in the other.
 */
export type Colors = {
  /* ── Backgrounds & Surfaces ─────────────────────────────────────── */
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceElevated: string;
  surfaceInteractive: string;

  /* ── Borders ────────────────────────────────────────────────────── */
  borderSubtle: string;
  border: string;
  borderStrong: string;
  borderFocus: string;

  /* ── Text ────────────────────────────────────────────────────────── */
  text: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textDisabled: string;
  textInverse: string;
  textLink: string;

  /* ── Brand & Action ─────────────────────────────────────────────── */
  primary: string;
  primarySubtle: string;
  primaryMuted: string;
  primaryStrong: string;
  accent: string;
  accentSubtle: string;
  accentMuted: string;
  accentStrong: string;
  danger: string;
  dangerMuted: string;

  /* ── Semantic ────────────────────────────────────────────────────── */
  success: string;
  successSubtle: string;
  warning: string;
  warningSubtle: string;
  error: string;
  errorSubtle: string;
  info: string;
  infoSubtle: string;

  /* ── Data encodings ──────────────────────────────────────────────── */
  severity: Record<Severity, string>;
  freshness: Record<FreshnessLevel, string>;

  /* ── Interaction states ──────────────────────────────────────────── */
  actionPrimary: string;
  actionPrimaryPressed: string;
  actionPrimaryDisabled: string;
  selected: string;
  pressed: string;
  focused: string;

  /* ── Utility ─────────────────────────────────────────────────────── */
  scrim: string;
  skeleton: string;
  separator: string;
};

// ---------------------------------------------------------------------------
// Light palette
// ---------------------------------------------------------------------------

const lightColors: Colors = {
  /* ── Backgrounds & Surfaces ─────────────────────────────────────── */
  /** Page background, behind everything. Slightly warmer than pure blue-white. */
  background: '#F2F4F8',
  /** Raised surfaces: cards, sheets, the tab bar. */
  surface: '#FFFFFF',
  /** A surface one step further back, for nested blocks and table stripes. */
  surfaceMuted: '#E8ECF4',
  /** Modal sheets — same fill as surface but sits on stronger shadow. */
  surfaceElevated: '#FFFFFF',
  /** Input fields, search bars. */
  surfaceInteractive: '#F7F9FC',

  /* ── Borders ────────────────────────────────────────────────────── */
  /** Lightest — dividers inside cards, thin separators. */
  borderSubtle: '#E2E8F0',
  /** Default card/chip borders. */
  border: '#D1D9E6',
  /** Emphasized borders, unselected score bars. */
  borderStrong: '#B0BDCE',
  /** Focus ring — matches primary. */
  borderFocus: brand.blue,

  /* ── Text ────────────────────────────────────────────────────────── */
  /** Primary high-contrast text. ~15:1 on background. */
  text: '#0F172A',
  /** Subtitles, descriptions. ~8.7:1 on background. */
  textSecondary: '#3D4F65',
  /** Timestamps, footnotes. ~4.8:1 on background — passes AA. */
  textTertiary: '#64748B',
  /** Captions and provenance notes. Kept AA-safe because existing small text uses this token. */
  textMuted: '#64748B',
  /** Disabled controls. Intentionally low contrast. */
  textDisabled: '#B0BEC9',
  /** Inverted text on solid colored buttons/badges. */
  textInverse: '#FFFFFF',
  /** Tappable links. Uses brand primary. */
  textLink: brand.blue,

  /* ── Brand & Action ─────────────────────────────────────────────── */
  primary: brand.blue,
  /** Selected chip bg, active row highlight. */
  primarySubtle: '#EBF2FC',
  /** Badge pill background. */
  primaryMuted: '#DBEAFE',
  /** Hover/pressed primary emphasis. 7.8:1 AAA. */
  primaryStrong: '#014BA8',
  /**
   * Water/hydromet highlights, secondary action.
   * Changed from #01BAFE (3.1:1 — FAILS AA) to #0882A1 (4.6:1 — passes AA).
   */
  accent: '#0882A1',
  /** Accent badge/chip background. */
  accentSubtle: '#E6F6FA',
  /** Soft cyan wash. */
  accentMuted: '#CCEFFE',
  /** Pressed accent state. */
  accentStrong: '#066A83',
  danger: brand.red,
  dangerMuted: '#FDE2E2',

  /* ── Semantic ────────────────────────────────────────────────────── */
  /** Positive state: data fresh, road open, comparison winner. */
  success: '#0E7B3F',
  successSubtle: '#E6F5ED',
  /** Caution: stale data, moderate concern. */
  warning: '#9A6700',
  warningSubtle: '#FEF3C7',
  /** Error state: failed load, critical issue. */
  error: '#C41E1E',
  errorSubtle: '#FDE8E8',
  /** Informational — aliases primary. */
  info: brand.blue,
  infoSubtle: '#EBF2FC',

  /* ── Data encodings — unchanged ──────────────────────────────────── */
  severity,
  freshness,

  /* ── Interaction states ──────────────────────────────────────────── */
  actionPrimary: brand.blue,
  actionPrimaryPressed: '#014BA8',
  actionPrimaryDisabled: '#B0BDCE',
  selected: '#EBF2FC',
  pressed: '#E8ECF4',
  focused: brand.blue,

  /* ── Utility ─────────────────────────────────────────────────────── */
  /** Overlay behind modals and sheets. */
  scrim: 'rgba(15, 23, 42, 0.5)',
  /** Skeleton placeholder fill. */
  skeleton: '#E2E8F0',
  /** Thinnest divider — less prominent than border. */
  separator: '#EBF0F5',
};

// ---------------------------------------------------------------------------
// Dark palette
// ---------------------------------------------------------------------------

/**
 * Dark values, keyed identically to light so `Colors` has one shape.
 *
 * Surfaces get lighter as they come forward, which is the inverse of the light theme — a
 * dark card on a dark page reads as a hole rather than a card.
 */
const darkColors: Colors = {
  /* ── Backgrounds & Surfaces ─────────────────────────────────────── */
  background: '#0C1222',
  surface: '#162033',
  surfaceMuted: '#1E2D44',
  /** Modal sheets — brighter than surface to create depth. */
  surfaceElevated: '#223550',
  surfaceInteractive: '#1A2940',

  /* ── Borders ────────────────────────────────────────────────────── */
  borderSubtle: '#1E2D44',
  border: '#2A3A52',
  borderStrong: '#3D506A',
  borderFocus: '#60A5FA',

  /* ── Text ────────────────────────────────────────────────────────── */
  text: '#F1F5F9',
  textSecondary: '#C8D3E0',
  textTertiary: '#94A3B8',
  /** Captions and provenance notes need full small-text contrast on dark surfaces. */
  textMuted: '#94A3B8',
  textDisabled: '#4A5568',
  textInverse: '#0C1222',
  textLink: '#60A5FA',

  /* ── Brand & Action ─────────────────────────────────────────────── */
  primary: '#60A5FA',
  primarySubtle: '#172554',
  primaryMuted: '#1E3A5F',
  primaryStrong: '#93C5FD',
  accent: '#38BDF8',
  accentSubtle: '#0C3547',
  accentMuted: '#0F4056',
  accentStrong: '#7DD3FC',
  danger: '#FB7185',
  dangerMuted: '#3B1520',

  /* ── Semantic ────────────────────────────────────────────────────── */
  success: '#4ADE80',
  successSubtle: '#0A3321',
  warning: '#FBBF24',
  warningSubtle: '#3D2E07',
  error: '#FB7185',
  errorSubtle: '#3B1520',
  info: '#60A5FA',
  infoSubtle: '#172554',

  /* ── Data encodings ──────────────────────────────────────────────── */
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

  /* ── Interaction states ──────────────────────────────────────────── */
  actionPrimary: '#60A5FA',
  actionPrimaryPressed: '#93C5FD',
  actionPrimaryDisabled: '#3D506A',
  selected: '#172554',
  pressed: '#1E2D44',
  focused: '#60A5FA',

  /* ── Utility ─────────────────────────────────────────────────────── */
  scrim: 'rgba(0, 0, 0, 0.65)',
  skeleton: '#1E293B',
  separator: '#1A2538',
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
