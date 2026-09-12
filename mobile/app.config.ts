import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Expo config as TypeScript so one codebase can produce three apps.
 *
 * `APP_VARIANT` selects the environment at build time. Bundle identifiers differ per variant
 * on purpose: development, preview and production installs must be able to coexist on one
 * device, or testers end up overwriting the build they were asked to verify.
 */
type Variant = 'development' | 'preview' | 'production';

const VARIANT = (process.env.APP_VARIANT as Variant | undefined) ?? 'development';

const NAME: Record<Variant, string> = {
  development: 'Pahad Pulse (Dev)',
  preview: 'Pahad Pulse (Preview)',
  production: 'Pahad Pulse',
};

const BUNDLE_SUFFIX: Record<Variant, string> = {
  development: '.dev',
  preview: '.preview',
  production: '',
};

const BASE_BUNDLE_ID = 'in.pahadpulse.app';

/** Taken from the logo. Keep in step with `src/theme/tokens.ts`. */
const BRAND_BLUE = '#015BD6';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: NAME[VARIANT],
  slug: 'pahad-pulse',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'pahadpulse',
  userInterfaceStyle: 'automatic',
  /**
   * Over-the-air updates are keyed to the runtime version. Tying it to `appVersion` means a
   * JS-only fix ships to everyone on the same store build, while any change that touches
   * native code requires a new store release rather than silently mismatching.
   */
  runtimeVersion: { policy: 'appVersion' },
  ios: {
    supportsTablet: true,
    bundleIdentifier: `${BASE_BUNDLE_ID}${BUNDLE_SUFFIX[VARIANT]}`,
    infoPlist: {
      // The portal is public and read-only. It never needs background location; asking for
      // "when in use" only is what keeps the App Store review question simple.
      NSLocationWhenInUseUsageDescription:
        'Pahad Pulse uses your location to show the district you are in first.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: `${BASE_BUNDLE_ID}${BUNDLE_SUFFIX[VARIANT]}`,
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-localization',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        dark: { backgroundColor: '#0B1220' },
        image: './assets/images/splash-icon.png',
        imageWidth: 180,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    variant: VARIANT,
    brandColor: BRAND_BLUE,
    router: {},
    /**
     * The `eas` key is OMITTED entirely until a project ID exists, rather than set to null.
     *
     * Expo's config serialisation turns a null here into `{}`, which is truthy — so the dev
     * server treats it as a real project ID, tries to sign the Expo Go manifest with it, and
     * fails with "The path argument must be of type string". An absent key takes the
     * unconfigured branch instead, which is what a fresh clone without EAS should do.
     *
     * `eas init` writes the real value; once it exists this passes it through.
     */
    ...(process.env.EAS_PROJECT_ID
      ? { eas: { projectId: process.env.EAS_PROJECT_ID } }
      : null),
  },
});
