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

/** Brand constants. Identical in light and dark - a brand colour does not change theme. */
export const brand = {
  /** The mountain. Primary action and identity colour. */
  blue: '#015BD6',
  /** The river. Secondary accent, used for water and hydromet data. */
  cyan: '#01BAFE',
  /** The pulse. Reserved for live/urgent signals - never decorative. */
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
// Alpha utility - avoids raw hex-alpha string concatenation in components.
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
 * strings - and so a new token cannot be added to one theme and forgotten in the other.
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

  /* ── Feature surfaces ────────────────────────────────────────────── */
  /** The gradient hero on the Today screen, and the ink and tiles drawn over it. */
  hero: HeroColors;
  /** The tinted state-signal tiles, one family per kind of signal. */
  tile: Record<TileTone, TileColors>;
};

/**
 * The hero is always a deep blue, in both themes, so its ink is fixed white. Status colours
 * over it are the light "fixed" tints: the regular severity colours are too dark to read on
 * the gradient.
 */
export type HeroColors = {
  start: string;
  end: string;
  ink: string;
  inkMuted: string;
  /** Translucent panels sitting on the gradient. */
  panel: string;
  panelDanger: string;
  panelCaution: string;
  statusClear: string;
  statusCaution: string;
  statusDanger: string;
};

/** Tile families. Named by hue, not by feature, so a new signal picks one without a new token. */
export type TileTone = 'red' | 'slate' | 'amber' | 'sky' | 'indigo' | 'emerald';

export type TileColors = {
  background: string;
  /** The solid square behind the tile's icon. */
  icon: string;
  /** The icon drawn on that square. */
  glyph: string;
  ink: string;
  inkMuted: string;
  /** The category pill. */
  pill: string;
};

// ---------------------------------------------------------------------------
// Light palette
// ---------------------------------------------------------------------------

/**
 * Light values: cool mountain-blue neutrals around the logo's own #015BD6, adopted with the
 * 2026-09-27 redesign. Primary is one step darker than the logo blue so text in it passes AA.
 */
const lightColors: Colors = {
  /* ── Backgrounds & Surfaces ─────────────────────────────────────── */
  /** Page background, behind everything. A faint blue-white. */
  background: '#FAF8FF',
  backgroundSecondary: '#F2F3FF',
  backgroundTertiary: '#EAEDFF',
  /** Raised surfaces: cards, sheets, the tab bar. */
  surface: '#FFFFFF',
  /** A surface one step further back, for nested blocks and table stripes. */
  surfaceMuted: '#F2F3FF',
  surfaceTertiary: '#EAEDFF',
  /** Modal sheets - same fill as surface but sits on stronger shadow. */
  surfaceElevated: '#FFFFFF',
  /** Input fields, search bars, chips. */
  surfaceInteractive: '#EEF0FF',
  surfaceGlass: 'rgba(250, 248, 255, 0.85)',
  surfaceGlassStrong: 'rgba(250, 248, 255, 0.94)',
  surfaceHighlight: 'rgba(255, 255, 255, 0.76)',

  /* ── Borders ────────────────────────────────────────────────────── */
  /** Lightest - dividers inside cards, thin separators. */
  borderSubtle: '#E2E7FF',
  /** Default card/chip borders. */
  border: '#C2C6D6',
  /** Emphasized borders, unselected score bars. */
  borderStrong: '#9A9FB2',
  /** Focus ring - matches primary. */
  borderFocus: '#0045A6',

  /* ── Text ────────────────────────────────────────────────────────── */
  /** Primary high-contrast text. ~16:1 on background. */
  text: '#131B2E',
  /** Subtitles, descriptions. ~9:1 on background. */
  textSecondary: '#424654',
  /** Timestamps, footnotes. ~6:1 on background - passes AA. */
  textTertiary: '#5A5F70',
  /** Captions and provenance notes. Kept AA-safe because existing small text uses this token. */
  textMuted: '#5A5F70',
  /** Disabled controls. Intentionally low contrast. */
  textDisabled: '#9A9EAE',
  /** Inverted text on solid colored buttons/badges. */
  textInverse: '#FFFFFF',
  /** Tappable links. Uses brand primary. */
  textLink: '#0045A6',

  /* ── Brand & Action ─────────────────────────────────────────────── */
  primary: '#0045A6',
  /** Selected chip bg, active row highlight. */
  primarySubtle: '#EEF1FF',
  /** Badge pill background. */
  primaryMuted: '#DAE2FF',
  /** Hover/pressed primary emphasis. */
  primaryStrong: '#00357F',
  brandCanvas: '#FFFFFF',
  secondary: '#006C4A',
  secondarySubtle: '#E6F8EF',
  secondaryMuted: '#C4F1DC',
  secondaryStrong: '#005137',
  /** Saffron. Non-danger attention: pilgrimage, caution. */
  accent: '#A95600',
  /** Accent badge/chip background. */
  accentSubtle: '#FFF8E8',
  accentMuted: '#FDEDC4',
  /** Pressed accent state. */
  accentStrong: '#884104',
  danger: '#BA1A1A',
  dangerMuted: '#FFDAD6',

  /* ── Semantic ────────────────────────────────────────────────────── */
  /** Positive state: data fresh, road open, comparison winner. */
  success: '#006C4A',
  successSubtle: '#E6F8EF',
  /** Caution: stale data, moderate concern. */
  warning: '#895900',
  warningSubtle: '#FFF1D6',
  /** Error state: failed load, critical issue. */
  error: '#BA1A1A',
  errorSubtle: '#FFDAD6',
  /** Informational - aliases primary. */
  info: '#0045A6',
  infoSubtle: '#DAE2FF',

  /* ── Data encodings - unchanged by the redesign ──────────────────── */
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
  actionPrimary: '#0045A6',
  actionPrimaryPressed: '#00357F',
  actionPrimaryDisabled: '#9A9FB2',
  selected: '#DAE2FF',
  pressed: '#E2E7FF',
  focused: '#0045A6',

  /* ── Utility ─────────────────────────────────────────────────────── */
  /** Overlay behind modals and sheets. */
  scrim: 'rgba(19, 27, 46, 0.52)',
  shadow: '#131B2E',
  /** Skeleton placeholder fill. */
  skeleton: '#E2E7FF',
  /** Thinnest divider - less prominent than border. */
  separator: '#E8EBF7',

  /* ── Feature surfaces ────────────────────────────────────────────── */
  hero: {
    start: '#0045A6',
    end: '#002F7A',
    ink: '#FFFFFF',
    inkMuted: 'rgba(255, 255, 255, 0.85)',
    panel: 'rgba(255, 255, 255, 0.12)',
    panelDanger: 'rgba(186, 26, 26, 0.32)',
    panelCaution: 'rgba(255, 183, 125, 0.22)',
    statusClear: '#85F8C4',
    statusCaution: '#FFB77D',
    statusDanger: '#FFDAD6',
  },
  tile: {
    red: {
      background: '#FEF2F2',
      icon: '#DC2626',
      glyph: '#FFFFFF',
      ink: '#7F1D1D',
      inkMuted: '#B91C1C',
      pill: '#FEE2E2',
    },
    slate: {
      background: '#F1F5F9',
      icon: '#334155',
      glyph: '#FFFFFF',
      ink: '#0F172A',
      inkMuted: '#475569',
      pill: '#E2E8F0',
    },
    amber: {
      background: '#FFFBEB',
      icon: '#D97706',
      glyph: '#FFFFFF',
      ink: '#78350F',
      inkMuted: '#92400E',
      pill: '#FEF3C7',
    },
    sky: {
      background: '#F0F9FF',
      icon: '#0284C7',
      glyph: '#FFFFFF',
      ink: '#0C4A6E',
      inkMuted: '#075985',
      pill: '#E0F2FE',
    },
    indigo: {
      background: '#EEF2FF',
      icon: '#4F46E5',
      glyph: '#FFFFFF',
      ink: '#312E81',
      inkMuted: '#3730A3',
      pill: '#E0E7FF',
    },
    emerald: {
      background: '#ECFDF5',
      icon: '#059669',
      glyph: '#FFFFFF',
      ink: '#064E3B',
      inkMuted: '#065F46',
      pill: '#D1FAE5',
    },
  },
};

// ---------------------------------------------------------------------------
// Dark palette
// ---------------------------------------------------------------------------

/**
 * Dark values, keyed identically to light so `Colors` has one shape.
 *
 * Surfaces get lighter as they come forward, which is the inverse of the light theme - a
 * dark card on a dark page reads as a hole rather than a card. Neutrals are a deep navy so
 * the blue identity carries into the dark theme.
 */
const darkColors: Colors = {
  /* ── Backgrounds & Surfaces ─────────────────────────────────────── */
  background: '#0B1220',
  backgroundSecondary: '#101829',
  backgroundTertiary: '#16203A',
  surface: '#131C2E',
  surfaceMuted: '#1A2438',
  surfaceTertiary: '#202B42',
  /** Modal sheets - brighter than surface to create depth. */
  surfaceElevated: '#26324B',
  surfaceInteractive: '#1A2438',
  surfaceGlass: 'rgba(19, 28, 46, 0.78)',
  surfaceGlassStrong: 'rgba(19, 28, 46, 0.94)',
  surfaceHighlight: 'rgba(255, 255, 255, 0.12)',

  /* ── Borders ────────────────────────────────────────────────────── */
  borderSubtle: '#202B42',
  border: '#2E3A55',
  borderStrong: '#46526E',
  borderFocus: '#B1C5FF',

  /* ── Text ────────────────────────────────────────────────────────── */
  text: '#EEF0FF',
  textSecondary: '#C6CBE0',
  textTertiary: '#A0A7BF',
  /** Captions and provenance notes need full small-text contrast on dark surfaces. */
  textMuted: '#A0A7BF',
  textDisabled: '#646C85',
  textInverse: '#0B1220',
  textLink: '#B1C5FF',

  /* ── Brand & Action ─────────────────────────────────────────────── */
  primary: '#B1C5FF',
  primarySubtle: '#1A2A4F',
  primaryMuted: '#22386A',
  primaryStrong: '#DAE2FF',
  brandCanvas: '#FFFFFF',
  secondary: '#68DBA9',
  secondarySubtle: '#0F3326',
  secondaryMuted: '#15493A',
  secondaryStrong: '#85F8C4',
  accent: '#FFB454',
  accentSubtle: '#392A0B',
  accentMuted: '#503A0B',
  accentStrong: '#FFD08A',
  danger: '#FFB4AB',
  dangerMuted: '#4A1616',

  /* ── Semantic ────────────────────────────────────────────────────── */
  success: '#68DBA9',
  successSubtle: '#0F3326',
  warning: '#F4BE58',
  warningSubtle: '#392A0B',
  error: '#FFB4AB',
  errorSubtle: '#4A1616',
  info: '#B1C5FF',
  infoSubtle: '#1A2A4F',

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
  actionPrimary: '#B1C5FF',
  actionPrimaryPressed: '#DAE2FF',
  actionPrimaryDisabled: '#46526E',
  selected: '#1A2A4F',
  pressed: '#202B42',
  focused: '#B1C5FF',

  /* ── Utility ─────────────────────────────────────────────────────── */
  scrim: 'rgba(0, 0, 0, 0.70)',
  shadow: '#000000',
  skeleton: '#202B42',
  separator: '#1A2438',

  /* ── Feature surfaces ────────────────────────────────────────────── */
  hero: {
    start: '#1D4FA8',
    end: '#0B2358',
    ink: '#FFFFFF',
    inkMuted: 'rgba(255, 255, 255, 0.82)',
    panel: 'rgba(255, 255, 255, 0.10)',
    panelDanger: 'rgba(255, 113, 136, 0.24)',
    panelCaution: 'rgba(255, 183, 125, 0.18)',
    statusClear: '#85F8C4',
    statusCaution: '#FFB77D',
    statusDanger: '#FFDAD6',
  },
  tile: {
    red: {
      background: '#2A1417',
      icon: '#DC2626',
      glyph: '#FFFFFF',
      ink: '#FECACA',
      inkMuted: '#FCA5A5',
      pill: '#4A1C1C',
    },
    slate: {
      background: '#1A2233',
      icon: '#475569',
      glyph: '#FFFFFF',
      ink: '#E2E8F0',
      inkMuted: '#A5B1C4',
      pill: '#273248',
    },
    amber: {
      background: '#2A200E',
      icon: '#D97706',
      glyph: '#FFFFFF',
      ink: '#FDE68A',
      inkMuted: '#FCD34D',
      pill: '#46300A',
    },
    sky: {
      background: '#0D2334',
      icon: '#0284C7',
      glyph: '#FFFFFF',
      ink: '#BAE6FD',
      inkMuted: '#7DD3FC',
      pill: '#0E3A55',
    },
    indigo: {
      background: '#1B1D3D',
      icon: '#4F46E5',
      glyph: '#FFFFFF',
      ink: '#C7D2FE',
      inkMuted: '#A5B4FC',
      pill: '#2A2A5E',
    },
    emerald: {
      background: '#0C2A21',
      icon: '#059669',
      glyph: '#FFFFFF',
      ink: '#A7F3D0',
      inkMuted: '#6EE7B7',
      pill: '#104235',
    },
  },
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
 * token to a concrete font family - see `theme/fonts.ts` for why numeric weights cannot be
 * used with a bundled font on Android.
 *
 * `lineHeight` is absolute because React Native rejects unitless multipliers, and letting
 * each component compute its own is how baselines drift between screens.
 *
 * `maxFontScale` caps how far the reader's system font size may enlarge a step. Android
 * allows up to 2x (iOS accessibility sizes go further), and many Android phones ship above
 * 1x by default. Reading text keeps full scaling; only the steps that live in fixed geometry
 * - figures in a tile, screen titles - are capped, because a 52px metric no longer fits the
 * card it was designed for and wraps mid-word instead.
 */
export const typography = {
  display: { fontSize: 32, lineHeight: 40, weight: 'bold', maxFontScale: 1.2 },
  title: { fontSize: 22, lineHeight: 30, weight: 'bold', maxFontScale: 1.3 },
  heading: { fontSize: 17, lineHeight: 24, weight: 'semibold', maxFontScale: 1.5 },
  body: { fontSize: 15, lineHeight: 22, weight: 'regular', maxFontScale: 2 },
  bodyStrong: { fontSize: 15, lineHeight: 22, weight: 'semibold', maxFontScale: 2 },
  caption: { fontSize: 13, lineHeight: 18, weight: 'regular', maxFontScale: 2 },
  /** For source lines and timestamps - the smallest size we allow. Also badges and pills. */
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
 * all on Android - see `AlertCard`.
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
