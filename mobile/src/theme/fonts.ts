import {
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_600SemiBold,
  NotoSans_700Bold,
} from '@expo-google-fonts/noto-sans';
import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
} from '@expo-google-fonts/noto-sans-devanagari';
import { Platform, type TextStyle } from 'react-native';

/**
 * Typography is BUNDLED, never inherited from the operating system.
 *
 * Left to the platform, iOS renders San Francisco and Android renders Roboto. Those two have
 * different cap heights, different advance widths and different default line heights, so the
 * same card is a different height on each — labels wrap on one platform and not the other,
 * and a grid of tiles stops lining up. Shipping the font makes text metrics a constant.
 *
 * Noto Sans is chosen because this app is bilingual. Noto Sans and Noto Sans Devanagari are
 * one superfamily with harmonised vertical metrics, so a district name in Hindi occupies the
 * same line box as the same name in English. Pairing two unrelated families is what makes a
 * layout jump when the reader switches language.
 */

/**
 * One family name per weight — the rule that matters most on Android.
 *
 * Android does NOT synthesise weights for a custom font: `fontWeight: '700'` against a
 * regular font file is silently ignored, so text that is bold on iOS renders regular on
 * Android and every heading changes width. Each weight is therefore loaded as its own family
 * and selected by name. `fontWeight` is never used with these.
 */
export const fontFamily = {
  regular: 'NotoSans_400Regular',
  medium: 'NotoSans_500Medium',
  semibold: 'NotoSans_600SemiBold',
  bold: 'NotoSans_700Bold',
} as const;

/** The Devanagari cut of the same superfamily, keyed identically. */
export const fontFamilyDevanagari = {
  regular: 'NotoSansDevanagari_400Regular',
  medium: 'NotoSansDevanagari_500Medium',
  semibold: 'NotoSansDevanagari_600SemiBold',
  bold: 'NotoSansDevanagari_700Bold',
} as const;

export type FontWeightToken = keyof typeof fontFamily;

/** Passed to `useFonts`. Every family named above must appear here or text falls back. */
export const fontAssets = {
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_600SemiBold,
  NotoSans_700Bold,
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
};

/** Devanagari, plus the Vedic extensions block. */
const DEVANAGARI = /[ऀ-ॿ꣠-ꣿ]/;

/**
 * Choose the script's family for a given string.
 *
 * Noto Sans Devanagari also carries Latin glyphs, so a mixed string ("Dehradun देहरादून")
 * renders correctly in it, while the Latin cut would show tofu for the Devanagari half. When
 * in doubt, the Devanagari family is the safe choice — hence the test is "contains any
 * Devanagari", not "is mostly Devanagari".
 */
export function familyFor(text: string, weight: FontWeightToken): string {
  return DEVANAGARI.test(text) ? fontFamilyDevanagari[weight] : fontFamily[weight];
}

/**
 * Android reserves extra vertical space above and below every line for accents it might
 * need, which iOS does not. Left on, an identical `lineHeight` produces a taller text block
 * on Android — the single most common reason a card looks right on one platform and cramped
 * or clipped on the other. Turning it off makes `lineHeight` mean the same thing on both.
 */
export const platformTextFixes: TextStyle = Platform.select({
  android: { includeFontPadding: false },
  default: {},
}) as TextStyle;
