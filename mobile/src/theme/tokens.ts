import { Platform, type ViewStyle } from 'react-native';

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
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  surfaceMuted: string;
  surfaceTertiary: string;
  surfaceElevated: string;
  surfaceInteractive: string;
  surfaceGlass: string;
  surfaceGlassStrong: string;
  surfaceHighlight: string;

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
  /** A consistent light canvas that preserves every colour in the official logo. */
  brandCanvas: string;
  secondary: string;
  secondarySubtle: string;
  secondaryMuted: string;
  secondaryStrong: string;
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
  severitySubtle: Record<Severity, string>;
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
  shadow: string;
  skeleton: string;
  separator: string;
};

// ---------------------------------------------------------------------------
// Light palette
// ---------------------------------------------------------------------------

const lightColors: Colors = {
  /* ── Backgrounds & Surfaces ─────────────────────────────────────── */
  /** Page background, behind everything. Slightly warmer than pure blue-white. */
  background: '#F2F7F7',
  backgroundSecondary: '#E8F2F1',
  backgroundTertiary: '#DCEDEB',
  /** Raised surfaces: cards, sheets, the tab bar. */
  surface: '#FBFDFD',
  /** A surface one step further back, for nested blocks and table stripes. */
  surfaceMuted: '#E8F1F0',
  surfaceTertiary: '#DDEBE9',
  /** Modal sheets — same fill as surface but sits on stronger shadow. */
  surfaceElevated: '#FFFFFF',
  /** Input fields, search bars. */
  surfaceInteractive: '#F0F6F6',
  surfaceGlass: 'rgba(251, 253, 253, 0.78)',
  surfaceGlassStrong: 'rgba(251, 253, 253, 0.92)',
  surfaceHighlight: 'rgba(255, 255, 255, 0.76)',

  /* ── Borders ────────────────────────────────────────────────────── */
  /** Lightest — dividers inside cards, thin separators. */
  borderSubtle: '#DCE8E6',
  /** Default card/chip borders. */
  border: '#C8DAD7',
  /** Emphasized borders, unselected score bars. */
  borderStrong: '#9DB9B4',
  /** Focus ring — matches primary. */
  borderFocus: '#075E9C',

  /* ── Text ────────────────────────────────────────────────────────── */
  /** Primary high-contrast text. ~15:1 on background. */
  text: '#102A2B',
  /** Subtitles, descriptions. ~8.7:1 on background. */
  textSecondary: '#314B4C',
  /** Timestamps, footnotes. ~4.8:1 on background — passes AA. */
  textTertiary: '#587071',
  /** Captions and provenance notes. Kept AA-safe because existing small text uses this token. */
  textMuted: '#587071',
  /** Disabled controls. Intentionally low contrast. */
  textDisabled: '#91A5A3',
  /** Inverted text on solid colored buttons/badges. */
  textInverse: '#FFFFFF',
  /** Tappable links. Uses brand primary. */
  textLink: '#075E9C',

  /* ── Brand & Action ─────────────────────────────────────────────── */
  primary: '#075E9C',
  /** Selected chip bg, active row highlight. */
  primarySubtle: '#EDF7FF',
  /** Badge pill background. */
  primaryMuted: '#D8EDFC',
  /** Hover/pressed primary emphasis. 7.8:1 AAA. */
  primaryStrong: '#064C80',
  brandCanvas: '#FFFFFF',
  secondary: '#147D71',
  secondarySubtle: '#ECFBF7',
  secondaryMuted: '#D1F5EB',
  secondaryStrong: '#106359',
  /**
   * Water/hydromet highlights, secondary action.
   * Changed from #01BAFE (3.1:1 — FAILS AA) to #0882A1 (4.6:1 — passes AA).
   */
  accent: '#A95600',
  /** Accent badge/chip background. */
  accentSubtle: '#FFF8E8',
  /** Soft cyan wash. */
  accentMuted: '#FDEDC4',
  /** Pressed accent state. */
  accentStrong: '#884104',
  danger: '#A71930',
  dangerMuted: '#FCE8EC',

  /* ── Semantic ────────────────────────────────────────────────────── */
  /** Positive state: data fresh, road open, comparison winner. */
  success: '#2E7D5B',
  successSubtle: '#E2F4EA',
  /** Caution: stale data, moderate concern. */
  warning: '#895900',
  warningSubtle: '#FFF1D6',
  /** Error state: failed load, critical issue. */
  error: '#A71930',
  errorSubtle: '#FCE8EC',
  /** Informational — aliases primary. */
  info: '#075E9C',
  infoSubtle: '#D8EDFC',

  /* ── Data encodings — unchanged ──────────────────────────────────── */
  severity: {
    minor: '#2E7D5B',
    moderate: '#895900',
    severe: '#C4420C',
    extreme: '#A71930',
    unknown: '#5F6F72',
  },
  severitySubtle: {
    minor: '#E2F4EA',
    moderate: '#FFF1D6',
    severe: '#FCE9DF',
    extreme: '#FCE8EC',
    unknown: '#E7ECEB',
  },
  freshness,

  /* ── Interaction states ──────────────────────────────────────────── */
  actionPrimary: '#075E9C',
  actionPrimaryPressed: '#064C80',
  actionPrimaryDisabled: '#9DB9B4',
  selected: '#D8EDFC',
  pressed: '#DDEBE9',
  focused: '#075E9C',

  /* ── Utility ─────────────────────────────────────────────────────── */
  /** Overlay behind modals and sheets. */
  scrim: 'rgba(7, 34, 57, 0.52)',
  shadow: '#102A2B',
  /** Skeleton placeholder fill. */
  skeleton: '#DCE8E6',
  /** Thinnest divider — less prominent than border. */
  separator: '#E3ECEB',
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
  background: '#071719',
  backgroundSecondary: '#0B2022',
  backgroundTertiary: '#103033',
  surface: '#10282A',
  surfaceMuted: '#163336',
  surfaceTertiary: '#1A3B3E',
  /** Modal sheets — brighter than surface to create depth. */
  surfaceElevated: '#1E4245',
  surfaceInteractive: '#143033',
  surfaceGlass: 'rgba(16, 40, 42, 0.72)',
  surfaceGlassStrong: 'rgba(16, 40, 42, 0.92)',
  surfaceHighlight: 'rgba(255, 255, 255, 0.12)',

  /* ── Borders ────────────────────────────────────────────────────── */
  borderSubtle: '#1A3B3E',
  border: '#285052',
  borderStrong: '#3C6869',
  borderFocus: '#65BFFC',

  /* ── Text ────────────────────────────────────────────────────────── */
  text: '#F2F8F7',
  textSecondary: '#C4D8D5',
  textTertiary: '#9CB6B2',
  /** Captions and provenance notes need full small-text contrast on dark surfaces. */
  textMuted: '#9CB6B2',
  textDisabled: '#607B77',
  textInverse: '#071719',
  textLink: '#65BFFC',

  /* ── Brand & Action ─────────────────────────────────────────────── */
  primary: '#65BFFC',
  primarySubtle: '#123A4D',
  primaryMuted: '#174D64',
  primaryStrong: '#98D5FC',
  brandCanvas: '#FFFFFF',
  secondary: '#5FD1BD',
  secondarySubtle: '#10392F',
  secondaryMuted: '#174D42',
  secondaryStrong: '#93E6D7',
  accent: '#FFB454',
  accentSubtle: '#392A0B',
  accentMuted: '#503A0B',
  accentStrong: '#FFD08A',
  danger: '#FF7188',
  dangerMuted: '#40141D',

  /* ── Semantic ────────────────────────────────────────────────────── */
  success: '#6DD6A6',
  successSubtle: '#10392B',
  warning: '#F4BE58',
  warningSubtle: '#392A0B',
  error: '#FF7188',
  errorSubtle: '#40141D',
  info: '#65BFFC',
  infoSubtle: '#123A4D',

  /* ── Data encodings ──────────────────────────────────────────────── */
  severity: {
    minor: '#6DD6A6',
    moderate: '#F4BE58',
    severe: '#FF925B',
    extreme: '#FF7188',
    unknown: '#A7B8B6',
  },
  severitySubtle: {
    minor: '#10392B',
    moderate: '#392A0B',
    severe: '#442014',
    extreme: '#40141D',
    unknown: '#263A3B',
  },
  freshness: {
    fresh: '#6DD6A6',
    stale: '#F4BE58',
    expired: '#FF7188',
    unknown: '#A7B8B6',
  },

  /* ── Interaction states ──────────────────────────────────────────── */
  actionPrimary: '#65BFFC',
  actionPrimaryPressed: '#98D5FC',
  actionPrimaryDisabled: '#3C6869',
  selected: '#123A4D',
  pressed: '#1A3B3E',
  focused: '#65BFFC',

  /* ── Utility ─────────────────────────────────────────────────────── */
  scrim: 'rgba(0, 0, 0, 0.70)',
  shadow: '#000000',
  skeleton: '#1A3B3E',
  separator: '#173437',
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
 *
 * `maxFontScale` caps how far the reader's system font size may enlarge a step. Android
 * allows up to 2x (iOS accessibility sizes go further), and many Android phones ship above
 * 1x by default. Reading text keeps full scaling; only the steps that live in fixed geometry
 * — figures in a tile, screen titles — are capped, because a 52px metric no longer fits the
 * card it was designed for and wraps mid-word instead.
 */
export const typography = {
  display: { fontSize: 32, lineHeight: 40, weight: 'bold', maxFontScale: 1.2 },
  title: { fontSize: 22, lineHeight: 30, weight: 'bold', maxFontScale: 1.3 },
  heading: { fontSize: 17, lineHeight: 24, weight: 'semibold', maxFontScale: 1.5 },
  body: { fontSize: 15, lineHeight: 22, weight: 'regular', maxFontScale: 2 },
  bodyStrong: { fontSize: 15, lineHeight: 22, weight: 'semibold', maxFontScale: 2 },
  caption: { fontSize: 13, lineHeight: 18, weight: 'regular', maxFontScale: 2 },
  /** For source lines and timestamps — the smallest size we allow. Also badges and pills. */
  footnote: { fontSize: 11, lineHeight: 16, weight: 'medium', maxFontScale: 1.6 },
  /** Figures. Tabular so digits do not jitter as values refresh. */
  metric: { fontSize: 26, lineHeight: 32, weight: 'bold', maxFontScale: 1.2 },
} as const satisfies Record<
  string,
  { fontSize: number; lineHeight: number; weight: FontWeightToken; maxFontScale: number }
>;

export type TypographyToken = keyof typeof typography;

/**
 * Elevation, resolved per platform here so no component ever writes a `Platform.select`.
 *
 * The two platforms do not have the same depth model, and pretending they do is what broke
 * the AgniVision cards on Android:
 *
 * - iOS draws a soft, spread shadow whose opacity and colour are honoured.
 * - Android ignores `shadowOpacity` and `shadowRadius` entirely. `elevation` casts a harder
 *   grey shadow from the view's outline, a coloured `shadowColor` paints a wide halo rather
 *   than a glow, and the shadow shows THROUGH a translucent background.
 *
 * So Android gets a lower elevation, and `Card` adds a hairline border there so the edge
 * stays legible without leaning on the shadow. Tinted cards (severity) must not use these at
 * all on Android — see `AlertCard`.
 */
const iosElevation = {
  none: {},
  low: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  medium: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
} as const satisfies Record<string, ViewStyle>;

const androidElevation = {
  none: {},
  low: { elevation: 1 },
  medium: { elevation: 3 },
} as const satisfies Record<keyof typeof iosElevation, ViewStyle>;

export type ElevationToken = keyof typeof iosElevation;

export const elevation: Record<ElevationToken, ViewStyle> =
  Platform.OS === 'android' ? androidElevation : iosElevation;

/**
 * Minimum visual touch target shared by both platforms.
 *
 * Android requires 48dp while iOS requires 44pt, so the cross-platform primitive uses the
 * stricter value. This avoids a control silently passing on iOS and becoming undersized in
 * the Android build.
 */
export const HIT_SLOP_MIN_SIZE = 48;
