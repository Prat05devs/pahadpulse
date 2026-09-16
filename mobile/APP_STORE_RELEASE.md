# Pahad Pulse — iOS App Store release

This is the operational handoff for the first App Store release. Do not create a production
build until every item in **Blocking inputs** is resolved; the app config deliberately rejects
localhost and non-HTTPS production URLs.

## Blocking inputs

- [x] Production API origin: `https://pahadpulse.onrender.com/api`.
- [x] Canonical public web origin: `https://www.pahadpulse.live`.
- [x] Deploy and verify `https://www.pahadpulse.live/privacy` and
      `https://www.pahadpulse.live/support`.
- [x] Support email: `admin@wtsolutions.cc`.
- [x] Public attribution is **Team Pahad Pulse** everywhere a reader can see it — the app,
      the website, store listings and copyright lines (© 2026 Pahad Pulse). No individual or
      company name appears in product copy; the client asked for the product to stand on its
      own name. Support contact is `admin@wtsolutions.cc`. Note the store listings also show
      the developer account name from App Store Connect and Play Console, which is set on
      those accounts, not in this repository.
- [ ] Create or confirm the Apple Developer and App Store Connect accounts.
- [ ] Create the App Store Connect app for bundle ID `in.pahadpulse.app`; record its numeric
      Apple ID as `ascAppId` in `eas.json` only after it exists.
- [ ] Run `eas init` and set `EAS_PROJECT_ID` if this project has not been linked to EAS.
- [x] iPad is not in v1 (decided 2026-09-15). `ios.supportsTablet` is `false`, so no iPad QA
      or iPad screenshots are needed; iPad can come in a later update.
- [x] Marketing version is `1.0.0`. The first store builds are produced locally (Xcode archive,
      Gradle bundle), so `ios.buildNumber` and `android.versionCode` in `app.config.ts` are set
      by hand — increment both before every upload.

## EAS environment setup

These public values are pinned in the preview and production profiles in `eas.json`, so the
release candidate and store build use the same live services:

```bash
EXPO_PUBLIC_API_URL=https://pahadpulse.onrender.com/api
EXPO_PUBLIC_WEB_URL=https://www.pahadpulse.live
```

Both are public bundle configuration, not credentials. If either origin changes, update both
profiles and repeat the live contract suite before building.

## App Store metadata draft (English — India)

- **Name:** Pahad Pulse
- **Subtitle:** Uttarakhand data, sourced
- **Primary category:** Reference
- **Secondary category:** Weather
- **Keywords:**
  `Uttarakhand,weather,alerts,districts,roads,tourism,AQI,earthquakes,government data`
- **Promotional text:**
  `Understand Uttarakhand through sourced district data, weather, alerts, roads, tourism and more.`
- **Description:**

  Pahad Pulse brings Uttarakhand's public information into one clear, source-first app.

  Check district profiles, weather, air quality, active alerts, roads, tourism, connectivity
  and recent seismic activity. Every figure identifies the department or public source that
  published it, the date it describes and how fresh it is.

  Use the map to explore the state, follow districts for faster return visits, switch between
  English and Hindi labels, and revisit previously loaded information when connectivity is
  limited. No account is required.

  Pahad Pulse consolidates public information; it does not issue official warnings or author
  government data. For safety-critical decisions, follow the linked issuing authority.

## Product-page assets

- [x] Primary icon is 1024×1024, square and fully opaque.
- [ ] Capture 1–10 truthful iPhone screenshots from a production-like preview build. Suggested
      order: Today, Map, District detail, Alerts, and Tourism/Connectivity.
- [ ] Because tablet support is enabled, capture the corresponding iPad set after tablet QA.
- [ ] Keep source attribution visible. Do not place unverified claims such as “real-time” or
      “official” in screenshot captions.
- [ ] Optional app preview: omit for v1 unless there is time to caption and localize it well.

## App Privacy and review notes

The current client has no account flow, advertising SDK, analytics SDK, tracking permission,
location request, camera request or photo-library request. It stores followed districts,
language, theme and a short-lived API cache on the device. `expo-secure-store` is present for
future sensitive local values but the current public flows do not create an identity.

Before answering **“No, we do not collect data from this app”**, verify production API/CDN
logging and retention. IP addresses or other request metadata retained or linked beyond the
immediate request can change the App Privacy answer. The disclosure must include third-party
partners as well as client code.

Suggested App Review note:

> Pahad Pulse is a public, read-only information app and requires no account. It consolidates
> data from attributed public sources. The app does not request location, tracking, camera,
> photo-library or notification access. Source links open in the system browser. Some screens
> retain previously loaded public data on-device for limited-connectivity use.

- [ ] Add the deployed privacy policy and support URLs in App Store Connect.
- [ ] Complete App Privacy after the server-log review.
- [ ] Complete the age-rating questionnaire from actual content. Alerts can describe natural
      disasters but the app contains no user-generated content, gambling or purchases.
- [ ] Declare that the app uses no non-exempt encryption; this is already configured with
      `ITSAppUsesNonExemptEncryption: false`.
- [ ] Confirm content rights for every government dataset, map layer, icon and image.
- [ ] No review account is needed unless authentication is added before submission.

## Release gate

Use Node 24 (or another Expo-supported LTS release) for every command.

```bash
source ~/.nvm/nvm.sh
nvm use 24
npm ci
npm run typecheck
npm run lint
npm test -- --runInBand
npm run doctor
APP_VARIANT=production \
EXPO_PUBLIC_API_URL=https://pahadpulse.onrender.com/api \
EXPO_PUBLIC_WEB_URL=https://www.pahadpulse.live \
npx expo config --type public
eas build --platform ios --profile preview
eas submit --platform ios --profile production
```

Do not submit the first production build directly to App Review. Distribute it through
TestFlight first and complete this matrix on the exact release candidate:

- [ ] Fresh install and cold launch.
- [ ] Today → District → source link; Map; Alerts → detail; More → every destination.
- [ ] Online, slow network, airplane mode with cache, and recovery after reconnecting.
- [ ] Background/foreground and process termination with followed districts preserved.
- [ ] VoiceOver reading/focus order and all controls reachable.
- [ ] Default text and the largest accessibility text size after a cold launch.
- [ ] Light, dark, Increase Contrast and Reduce Motion.
- [ ] Current compact iPhone, large iPhone and every supported iPad layout/orientation.
- [ ] Production API/server smoke test and all source links.

After TestFlight sign-off: build production, submit it to App Store Connect, attach the tested
build to the version, complete compliance/privacy/age-rating fields, and submit for review.
Use a phased release and monitor crashes plus API failures for at least 48 hours.
