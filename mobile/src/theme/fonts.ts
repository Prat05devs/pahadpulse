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
 * Noto Sans is chosen because this app is bilingual: Noto Sans and Noto Sans Devanagari are
 * one superfamily designed to sit together, which two unrelated families would not.
 *
 * Their vertical metrics are NOT identical, though (measured from the bundled files):
 *
 *   Noto Sans             ascent 1.069em, descent 0.293em, tallest glyph 1.07em
 *   Noto Sans Devanagari  ascent 0.896em, descent 0.408em, tallest glyph 1.35em
 *
 * Devanagari vowel signs and reph rise well above the font's own ascent. That is harmless on
 * iOS, which lets glyphs overflow a line box, but Android clips them — see
 * `platformTextFixes` below.
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

export function containsDevanagari(text: string): boolean {
  return DEVANAGARI.test(text);
}

/**
 * Choose the script's family for a given string.
 *
 * Noto Sans Devanagari also carries Latin glyphs, so a mixed string ("Dehradun देहरादून")
 * renders correctly in it, while the Latin cut would show tofu for the Devanagari half. When
 * in doubt, the Devanagari family is the safe choice — hence the test is "contains any
 * Devanagari", not "is mostly Devanagari".
 */
export function familyFor(text: string, weight: FontWeightToken): string {
  return containsDevanagari(text) ? fontFamilyDevanagari[weight] : fontFamily[weight];
}

/**
 * Android's per-script text fix.
 *
 * Android reserves extra space above the first line and below the last for glyphs that
 * overflow the font's ascent, which iOS does not. For Latin text that padding is dead space
 * (Noto Sans never exceeds its ascent), so it is turned off and `lineHeight` means the same
 * thing on both platforms — otherwise the same card is taller on Android.
 *
 * For Devanagari it is the opposite: the matras above the headline DO exceed the ascent, and
 * Android clips a TextView's drawing to its bounds, so with the padding off the tops of Hindi
 * words are cut off on the first line. It stays on there. A Hindi label is then a few pixels
 * taller on Android than on iOS, which is the correct trade against clipped text.
 */
export function platformTextFixes(text: string): TextStyle {
  if (Platform.OS !== 'android') return {};
  return { includeFontPadding: containsDevanagari(text) };
}
