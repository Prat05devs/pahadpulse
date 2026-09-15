# Android — design parity rules and release

The companion to `APP_STORE_RELEASE.md`. It exists because the AgniVision cards looked right on
iOS and broke on Android, and every rule below is a specific way that happened or was about to
happen here.

## 1. Parity rules

Android is not "iOS with Roboto". These are enforced in the shared primitives, so a screen that
uses `Text`, `Card` and `Pressable` gets them for free. **Do not work around the primitives.**

| # | Rule | Where it lives | What breaks without it |
|---|------|----------------|------------------------|
| A1 | Text only through the `Text` atom. Never set `fontWeight`; weight is a family name. | `components/atoms/text.tsx`, `theme/fonts.ts` | Android ignores `fontWeight` on a bundled font, so bold renders regular and headings change width. |
| A2 | Font padding is **off for Latin, on for Devanagari** on Android. | `platformTextFixes()` | Off everywhere: Hindi matras are clipped at the top of the first line. On everywhere: every Latin card is taller than on iOS. |
| A3 | Every type step has a `maxFontScale`. Figures and titles are capped; reading text scales to 2x. | `typography` in `theme/tokens.ts` | Many Android phones ship above 1x. A 26px metric at 1.3x wraps mid-word inside its tile. |
| A4 | Depth comes from `theme.elevation` only. Android gets low `elevation` plus a hairline border; iOS gets soft shadows. | `elevation` in `theme/tokens.ts`, `Card` | Android ignores `shadowOpacity`/`shadowRadius`, so hand-written shadows render as hard grey bands. |
| A5 | A tinted (severity) card on Android has **no elevation and no `shadowColor`**: opaque tinted surface plus tinted border. | `AlertCard` | A coloured `shadowColor` becomes a wide halo, and elevation shows through a translucent fill. |
| A6 | Never put elevation on a translucent background. | `Card` glass tone is opaque on Android | The shadow is visible through the card. |
| A7 | No `android_ripple`. Press feedback is the shared scale-and-dim. | `Pressable` | A ripple ignores the rounded card inside it, so every tap showed square grey corners. |
| A8 | Anything that is not a `Text` atom names its font: native headers, tab labels, badges, `TextInput`. | `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `districts-screen.tsx` | It renders in Roboto on Android. Headers were also left-aligned instead of centred. |
| A9 | No fixed pixel `width` on a text column. Scale it by `fontScale`, capped at that step's `maxFontScale`. | `weather-panel.tsx`, `alert-detail-screen.tsx` | "16 Sept 2026" wrapped at the first larger font step. |
| A10 | Card grids stack on narrow or large-text screens (`shouldStackCardGrid`), and the row must `wrap`. | `lib/layout.ts`, `today-screen.tsx` | Common Android widths are 360–412dp, narrower than the 390pt the iOS simulator hides behind. |
| A11 | No iOS-only props without an Android equivalent: `clearButtonMode`, `adjustsFontSizeToFit` without `numberOfLines`, `GlassView`. | Search field draws its own clear button | The feature silently does not exist on Android. |
| A12 | The tab bar hides while the keyboard is open, and tab labels do not scale. | `app/(tabs)/_layout.tsx` | Android resizes the window for the keyboard and lifts the tab bar on top of it. |
| A13 | The native window background follows the theme. | `SystemUI.setBackgroundColorAsync` in `app/_layout.tsx` | A white flash behind every screen transition in dark mode. |
| A14 | Links open through `openExternal()`. | `lib/external-link.ts` | On a device with no Custom Tabs browser the tap does nothing. |
| A15 | Haptics use `performAndroidHapticsAsync` on Android. | `Pressable` | The Vibrator API buzzes and ignores the reader's touch-feedback setting. |

Covered by tests in `src/theme/platform.test.ts` and `src/lib/external-link.test.ts`. The theme
tests run on **both** platforms; jest-expo would otherwise only ever exercise iOS.

## 2. Build configuration

- **Built by EAS in the cloud**, not locally. This machine has no Android SDK, and a local
  toolchain needs 12–15 GB of disk.
- **Signing:** EAS generates and stores the upload keystore on the first production build.
  Never let a build fall back to the template's `signingConfigs.debug`, which Play rejects.
  Enrol in Play App Signing when creating the app, so a lost upload key can be reset.
- **versionCode:** owned by EAS (`appVersionSource: "remote"`, `autoIncrement`). Play rejects a
  reused versionCode.
- **Permissions:** the template's `SYSTEM_ALERT_WINDOW` and legacy storage permissions are
  blocked in `app.config.ts`. What remains is `INTERNET` and `VIBRATE`.
- **Target SDK 36, min SDK 24, 16 KB page size:** provided by React Native 0.86 / Expo SDK 57.
  Nothing to set.
- **Edge-to-edge:** on, and mandatory on Android 15+. Screens without a navigation header own
  the top inset (`useSafeAreaInsets`); the tab bar owns the bottom.
- **R8 / resource shrinking: off, on purpose for 1.0.0.** AgniVision needed hand-written keep
  rules to make it safe. Enable it only once a preview APK of the minified build has been
  tested on a real device, because a stripped class is a crash at launch, not a build error.

## 3. Release steps

One-time setup:

```sh
npm install -g eas-cli
eas login
cd mobile
eas init        # prints a project ID. app.config.ts is dynamic, so eas cannot write it back:
                # set EAS_PROJECT_ID in the EAS environment variables AND in your shell
                # before `eas build`, because the config is evaluated in both places
```

For each release:

```sh
# 1. A preview APK for device QA (installs directly, no Play Console needed)
eas build -p android --profile preview

# 2. Run the device checklist below on that APK

# 3. The store bundle (.aab)
eas build -p android --profile production

# 4. Upload to Play Console, internal testing track first
eas submit -p android --profile production   # or upload the .aab by hand
```

## 4. Device QA checklist

Test on at least one **360dp** phone (for example a Samsung A-series) and one **412dp** phone,
in light and dark mode. Tick every item before promoting a build past internal testing.

**Layout and type**
- [ ] Today: stat tiles are equal height; no value wraps mid-word ("Highways", "Compare").
- [ ] Today: "Uttarakhand at a glance" cards form a clean grid with no clipped figures.
- [ ] Alert cards: tinted surface and border, **no grey or coloured halo** around the card.
- [ ] District cards: tapping shows no square grey corners.
- [ ] Pushed screens: header title is Noto Sans and centred.
- [ ] Settings → हिन्दी: Hindi names show full matras, with no clipped tops on the first line.
- [ ] System font size at maximum: nothing overlaps; Today tiles stack; tab labels stay inside the bar.
- [ ] Display size at largest: same as above.
- [ ] Weather forecast rows: dates and temperatures stay on one line at 1.3x font.
- [ ] Compare districts on a 360dp phone: result cards stack, names do not collide with scores.

**Behaviour**
- [ ] Districts search: keyboard opens, tab bar hides, the ✕ clears the query.
- [ ] Dark mode: no white flash when opening a district or alert.
- [ ] Hardware or gesture back closes the credits sheet and the compare picker before leaving the screen.
- [ ] Map: terrain loads, layer chips toggle, zoom buttons work, pinch works.
- [ ] Source links open in a browser; with Chrome disabled they still open.
- [ ] Follow a district: haptic tick respects Settings → Sound and vibration → Touch feedback.
- [ ] Pull to refresh on Today and Districts.
- [ ] Airplane mode: offline message, not a blank screen; cached data still shows.
- [ ] Rotate to landscape and back: layout recovers.

**Store listing**
- [ ] App content → Data safety matches what the app actually sends. There are no accounts and
      location is blocked; confirm nothing else is collected before declaring "no data".
- [ ] Privacy policy URL points to `https://www.pahadpulse.live/privacy`.
- [ ] Screenshots taken from the production build, not the simulator.
