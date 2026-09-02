# Mobile — 11 Build & Release

EAS Build, EAS Submit, EAS Update. Releases are slow and irreversible-ish, so the process is
stricter than the web's.

---

## 1. Configuration — `app.config.ts`

Dynamic TypeScript config, so builds vary by environment. Never a static `app.json`.

```ts
import type { ExpoConfig, ConfigContext } from 'expo/config';

const VARIANTS = {
  development: { name: 'BasicTech (Dev)',     id: 'com.basictech.app.dev',     scheme: 'basictech-dev' },
  preview:     { name: 'BasicTech (Preview)', id: 'com.basictech.app.preview', scheme: 'basictech-preview' },
  production:  { name: 'BasicTech',           id: 'com.basictech.app',         scheme: 'basictech' },
} as const;

export default ({ config }: ConfigContext): ExpoConfig => {
  const profile = (process.env.APP_VARIANT ?? 'development') as keyof typeof VARIANTS;
  const variant = VARIANTS[profile];

  return {
    ...config,
    name: variant.name,
    slug: 'basictech-app',
    scheme: variant.scheme,
    version: '1.4.0',                       // user-facing, semver
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      bundleIdentifier: variant.id,
      supportsTablet: false,
      associatedDomains: ['applinks:app.basictech.com'],
      infoPlist: {
        NSCameraUsageDescription: 'Take a photo to use as your article cover image.',
        NSPhotoLibraryUsageDescription: 'Choose a photo to use as your article cover image.',
      },
    },
    android: {
      package: variant.id,
      adaptiveIcon: { foregroundImage: './assets/images/adaptive-icon.png', backgroundColor: '#FFFFFF' },
      intentFilters: [{
        action: 'VIEW', autoVerify: true,
        data: [{ scheme: 'https', host: 'app.basictech.com' }],
        category: ['BROWSABLE', 'DEFAULT'],
      }],
    },
    plugins: ['expo-router', 'expo-secure-store', 'expo-font', ['expo-build-properties', { ios: { useFrameworks: 'static' } }]],
    extra: { eas: { projectId: process.env.EAS_PROJECT_ID } },
    updates: { fallbackToCacheTimeout: 0 },
    runtimeVersion: { policy: 'appVersion' },
  };
};
```

**Different bundle IDs per variant** so dev, preview, and production can be installed side by
side on one device. This pays for itself in the first week.

iOS **purpose strings are mandatory** — App Store review rejects builds that request a
permission without one.

---

## 2. Build profiles — `eas.json`

```jsonc
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "APP_VARIANT": "development", "EXPO_PUBLIC_API_BASE_URL": "https://api.dev.basictech.com/api" }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "env": { "APP_VARIANT": "preview", "EXPO_PUBLIC_API_BASE_URL": "https://api.staging.basictech.com/api" }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true,
      "env": { "APP_VARIANT": "production", "EXPO_PUBLIC_API_BASE_URL": "https://api.basictech.com/api" }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "release@basictech.com", "ascAppId": "1234567890" },
      "android": { "serviceAccountKeyPath": "./secrets/play-service-account.json", "track": "internal" }
    }
  }
}
```

| Profile | Purpose | Who gets it |
|---|---|---|
| `development` | dev client with fast refresh | engineers |
| `preview` | release-like internal build | QA, PM, stakeholders |
| `production` | store build | end users |

Secrets go in **EAS Secrets** (`eas secret:create`), never in `eas.json` and never in git.
Remember: `EXPO_PUBLIC_*` values are baked into the bundle and are public.

---

## 3. Versioning

| Field | Meaning | Who bumps it |
|---|---|---|
| `version` (`1.4.0`) | user-facing semver | humans, per release |
| `ios.buildNumber` / `android.versionCode` | build counter | EAS, via `autoIncrement` |
| `runtimeVersion` | native-compatibility marker for OTA | derived from `version` |

**`runtimeVersion` is the critical one.** An OTA update is only delivered to installed apps
with a matching `runtimeVersion`. Policy `appVersion` means: bump `version` whenever the native
layer changes, and old installs will not receive an incompatible JS bundle. Getting this wrong
ships a JS bundle to a binary that lacks the native module it calls, and the app crashes on
launch for everyone.

Semver: **major** = breaking UX or a forced upgrade; **minor** = features; **patch** = fixes.

---

## 4. OTA vs store build

| Change | Mechanism |
|---|---|
| JS, styles, images, copy, most bug fixes | **EAS Update** — minutes |
| New native module or Expo plugin | store build |
| Permission change, purpose string | store build |
| Expo SDK upgrade | store build |
| App icon, splash, name, bundle ID | store build |
| Anything that changes `runtimeVersion` | store build |

```bash
eas update --branch production --message "Fix article list crash on empty tags"
```

Rules: OTA updates go through **the same review and CI** as any change — they are production
deploys. Roll out to `preview` first. Keep the previous update republishable
(`eas update:republish`) so rollback is one command. Never OTA on a Friday.

---

## 5. Release process

```
1. Cut a release branch / tag from main
2. Bump `version`; write release notes
3. eas build --profile preview        (both platforms)
4. QA: full manual matrix (mobile/08 §9)
5. eas build --profile production
6. eas submit --profile production
7. iOS: TestFlight external test  |  Android: internal → closed track
8. Staged rollout: Android 10% → 50% → 100%; iOS phased release
9. Monitor crash-free rate and key funnels for 48h
10. Tag the release; publish notes
```

**Do not skip the staged rollout.** It is the only rollback mechanism a native app has — once
100% of users have a broken binary, the fix takes days.

Release cadence: a predictable train (e.g. every two weeks) beats ad-hoc releases. Hotfixes go
out of band, OTA where possible.

---

## 6. Store requirements

Have these ready before the first submission — they block release, and gathering them takes
longer than you expect:

| Item | iOS | Android |
|---|---|---|
| App icon | 1024×1024, no alpha | adaptive icon layers |
| Screenshots | per required device size | phone + tablet |
| Description, keywords | yes | yes |
| Privacy policy URL | required | required |
| Data-collection disclosure | App Privacy questionnaire | Data safety form |
| Age rating | yes | content rating questionnaire |
| Test account for review | required if there's a login | required |
| Permission purpose strings | `infoPlist` | manifest + runtime rationale |
| Export compliance | declare encryption usage | — |

The **privacy disclosure must match reality**. If you ship an analytics SDK, declare it. A
mismatch is a rejection and, later, a policy strike.

---

## 7. CI/CD

```yaml
name: mobile
on:
  pull_request:
  push: { tags: ['mobile-v*'] }

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'npm' }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npx expo-doctor

  build-preview:
    if: github.event_name == 'pull_request'
    needs: verify
    runs-on: ubuntu-latest
    steps:
      - uses: expo/expo-github-action@v8
        with: { eas-version: latest, token: '${{ secrets.EXPO_TOKEN }}' }
      - run: eas build --profile preview --platform all --non-interactive --no-wait
```

`npx expo-doctor` catches dependency-version mismatches with the Expo SDK — the most common
cause of "works locally, crashes in a build".

---

## 8. Monitoring after release

| Metric | Target | Tool |
|---|---|---|
| Crash-free sessions | > 99.5% | Sentry |
| Crash-free users | > 99.8% | Sentry |
| Cold start p95 | < 3 s | Sentry Performance |
| ANR rate (Android) | < 0.47% | Play Console |
| Adoption of latest version | tracked | Store consoles |
| API error rate from mobile | < 1% | backend logs, filtered by `X-App-Version` |

Sentry with source maps uploaded per build (a stack trace without source maps is useless).
Alert on a crash-rate spike after a release.

The app sends `X-App-Version` on every request so the backend can attribute errors to a
release and enforce a minimum-version floor.

---

## 9. Rollback

| Problem | Action |
|---|---|
| Bad JS in an OTA update | `eas update:republish` the previous update — minutes |
| Bad JS in a store build | ship an OTA fix — minutes to hours |
| Bad native code | halt the staged rollout; submit a fixed build — days |
| Catastrophic | remove the release from sale; expedited review request |

This asymmetry is exactly why staged rollout and OTA-first fixes matter.

---

## 10. Checklist

- [ ] `app.config.ts` (dynamic), distinct bundle IDs per variant.
- [ ] All purpose strings and intent filters declared.
- [ ] Secrets in EAS Secrets; nothing sensitive behind `EXPO_PUBLIC_`.
- [ ] `runtimeVersion` policy correct; native changes bump `version`.
- [ ] `npx expo-doctor` clean.
- [ ] Preview build QA'd against the full manual matrix.
- [ ] Deep links verified on both platforms.
- [ ] Source maps uploaded to Sentry.
- [ ] Store metadata, screenshots, privacy disclosure, and review test account ready.
- [ ] Staged rollout configured; monitoring and alerts live.
- [ ] Rollback path known and rehearsed before the release goes out.
