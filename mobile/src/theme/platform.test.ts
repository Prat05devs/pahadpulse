/**
 * The Android-specific rules in the theme, checked on both platforms.
 *
 * jest-expo runs as iOS by default, so a rule that only exists on Android would never be
 * exercised at all. Each case loads the module in an isolated registry and sets `Platform.OS`
 * on THAT registry's copy of react-native — patching the top-level import would miss it,
 * because isolation hands the module under test a fresh `Platform` object.
 */
function withPlatform<T>(os: 'ios' | 'android', load: () => T): T {
  let result: T | undefined;
  jest.isolateModules(() => {
    const { Platform } = require('react-native') as typeof import('react-native');
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    result = load();
  });
  return result as T;
}

type FontsModule = typeof import('./fonts');
type TokensModule = typeof import('./tokens');

describe('platformTextFixes', () => {
  it('turns font padding off for Latin text on Android, so lineHeight matches iOS', () => {
    const fixes = withPlatform('android', () =>
      (require('./fonts') as FontsModule).platformTextFixes('Dehradun')
    );
    expect(fixes).toEqual({ includeFontPadding: false });
  });

  it('keeps font padding for Devanagari on Android, so matras are not clipped', () => {
    const fixes = withPlatform('android', () =>
      (require('./fonts') as FontsModule).platformTextFixes('देहरादून')
    );
    expect(fixes).toEqual({ includeFontPadding: true });
  });

  it('adds nothing on iOS, which never clips glyphs to the line box', () => {
    const fixes = withPlatform('ios', () =>
      (require('./fonts') as FontsModule).platformTextFixes('देहरादून')
    );
    expect(fixes).toEqual({});
  });
});

describe('elevation', () => {
  it('uses soft shadows and no Android elevation on iOS', () => {
    const { elevation } = withPlatform('ios', () => require('./tokens') as TokensModule);
    expect(elevation.low).toMatchObject({ shadowOpacity: 0.06 });
    expect(elevation.low).not.toHaveProperty('elevation');
  });

  it('uses elevation only on Android, with no shadow keys it would misrender', () => {
    const { elevation } = withPlatform('android', () => require('./tokens') as TokensModule);
    expect(elevation.low).toEqual({ elevation: 1 });
    expect(elevation.medium).toEqual({ elevation: 3 });
  });
});

describe('typography', () => {
  it('caps the fixed-geometry steps and leaves reading text fully scalable', () => {
    const { typography } = require('./tokens') as TokensModule;
    expect(typography.metric.maxFontScale).toBeLessThanOrEqual(1.3);
    expect(typography.display.maxFontScale).toBeLessThanOrEqual(1.3);
    // Android's largest system font is 2x; body copy must reach it.
    expect(typography.body.maxFontScale).toBe(2);
    expect(typography.caption.maxFontScale).toBe(2);
  });
});
