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

/** Accessible interface blue derived from the logo. Keep in step with `src/theme/tokens.ts`. */
const BRAND_BLUE = '#075E9C';

/**
 * A production binary must never silently inherit the localhost development defaults from
 * `src/config/env.ts`. EAS evaluates this file before bundling, so failing here prevents a
 * store build whose every request would be sent to the reader's own phone.
 */
function assertProductionUrl(name: string, value: string | undefined): void {
  if (VARIANT !== 'production') return;

  if (!value) {
    throw new Error(`${name} must be set in the EAS production environment.`);
  }

  const url = new URL(value);
  if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error(`${name} must be a public HTTPS URL for production builds.`);
  }
}

assertProductionUrl('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL);
assertProductionUrl('EXPO_PUBLIC_WEB_URL', process.env.EXPO_PUBLIC_WEB_URL);

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: NAME[VARIANT],
  slug: 'pahad-pulse',
  version: '0.1.0',
  orientation: 'default',
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
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: `${BASE_BUNDLE_ID}${BUNDLE_SUFFIX[VARIANT]}`,
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      backgroundColor: '#F2F7F7',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    blockedPermissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ],
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
        backgroundColor: '#F2F7F7',
        dark: { backgroundColor: '#071719' },
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
    ...(process.env.EAS_PROJECT_ID ? { eas: { projectId: process.env.EAS_PROJECT_ID } } : null),
  },
});
