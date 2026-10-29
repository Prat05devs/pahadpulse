# Pahad Pulse — Google Play and App Store submission guide

Prepared 29 October 2026 for Android **1.0.1** (`versionCode` 8) and iOS **1.0.2** (build 8).
iOS is 1.0.2 because App Store Connect had already approved a 1.0.1; Apple closes a version
once it is approved, so each release needs a higher version number there.
Policies change; re-check the linked official pages before each submission.

The aim is a first-time acceptance on both stores. Most rejections of an app like this come
from three things: looking like a government app, a store listing that does not match the app,
and a broken privacy-policy link. Each is handled below.

---

## 0. Fix before you submit anything

| # | Blocker | Status on 29 Oct 2026 | What to do |
|---|---|---|---|
| 0.1 | **Website is down while it moves from Vercel to Hostinger.** The domain already points to Hostinger, which serves only its placeholder, so **`/privacy`** and **`/support`** do not open. Both stores reject an app whose privacy link does not open. | In progress | Finish §0.1, then check both links. |
| 0.2 | Privacy policy and support pages list `admin@wtsolutions.cc` as the contact. The product is attributed to Pahad Pulse alone, and a reviewer comparing the developer name with that address may ask who the developer is. | Decide | Create `support@pahadpulse.live` (Hostinger email already serves the domain) and use it on both pages and in both consoles. |
| 0.3 | Mac disk space (~2 GB free). An Xcode archive needs 6–8 GB. | Blocks iOS | Free space (npm/Expo/pnpm caches, old simulators, old Xcode archives) before **Product → Archive**. |
| 0.4 | Installed copies of older builds call the suspended Render server and show no data. | Fixed by this release | Ship Android 1.0.1 (8) and iOS 1.0.2 (8) promptly. A reviewer testing an older TestFlight or internal build would see an empty app. |

### 0.1 Move the website to Hostinger

The website is a Next.js app in `web/`. It runs as a Hostinger **Node.js web app** (the same
setup as other sites on this account); Vercel is retired once it works.

1. Delete the placeholder website **pahadpulse.live** (type PHP/HTML, created 12 Oct 2026):
   **Websites → pahadpulse.live → Advanced → Delete website**. A domain can belong to only one
   website, and this one shows nothing but "Default page". Email (MX) is not affected.
2. **Websites → Add website → Node.js web app → Import Git repository** → GitHub
   `Prat05devs/pahadpulse`. Settings:

   | Setting | Value |
   |---|---|
   | Framework preset | **Next.js** |
   | Branch | `main` |
   | Root directory | `web` |
   | Node version | 22.x |
   | Build command / output | `npm run build` / `.next` |
   | Package manager | npm |
   | Environment variables | `NEXT_PUBLIC_API_URL=https://api.pahadpulse.live/api` and `NEXT_PUBLIC_SITE_URL=https://www.pahadpulse.live` (read at build time — redeploy after changing them) |
   | Domain | `pahadpulse.live` — connect with the **DNS records** option, never by changing nameservers |
   | Auto-deployment | On |

3. Check **Domains → pahadpulse.live → DNS records** afterwards: `@` and `www` point to the new
   app, `A api → 139.59.72.220` is still there, MX/TXT/autodiscover/autoconfig unchanged.
4. When `https://www.pahadpulse.live`, `/privacy`, `/support` and `/roads` open with SSL, remove
   both domains from the Vercel project and delete or pause it.

---|---|---|
   | A | `@` | `216.198.79.1` (Vercel) — delete any `82.25.106.128` A record and any ALIAS / AAAA on `@` |
   | CNAME | `www` | `360933028f560c3c.vercel-dns-017.com` |
   | A | `api` | `139.59.72.220` (DigitalOcean droplet) — keep |
   | MX, TXT, autodiscover, autoconfig | — | keep as they are |

4. Check after 5–15 minutes: `https://www.pahadpulse.live/privacy` and `/support` open, and
   `curl -sI https://www.pahadpulse.live | grep server` says `Vercel`.

---

## 1. How Pahad Pulse must present itself (both stores)

Pahad Pulse is an **independent, free, non-commercial platform** that organises information
already published online by public bodies. It is **not** a government app and must never look
like one. Both stores reject apps that imply government affiliation without authorisation
(Google Play *Misleading Claims* and *Government apps* requirements; Apple guidelines 5.2.1 and
2.3).

**Always**
- Say "independent" and name the sources (IMD, NDMA SACHET, PWD Uttarakhand, Open-Meteo, USGS,
  NASA FIRMS, GDACS, Census) in the store description.
- Keep the in-app disclaimer — already present in the app under **About / Credits** ("An
  independent platform … not a government application … not affiliated with, endorsed by, or
  operated by the Government of Uttarakhand, the Government of India or any of their
  departments").
- Keep every figure linked to the department that published it (already true in the app).
- State that the app does not issue official warnings and that users should follow the issuing
  authority for safety decisions.

**Never** — in the name, icon, screenshots, description, keywords or release notes
- "Official", "Govt", "Government of Uttarakhand", "Uttarakhand Government", "Sarkar",
  "Ministry", "Department".
- The Ashoka emblem, the Uttarakhand state emblem, any department logo, or a tricolour styled
  as an official seal.
- Screenshots of department websites.
- The developer name or contact email of anyone other than Pahad Pulse.

**Road closures are the one exception to "public data only":** they are shown with written
permission from PWD Uttarakhand, approved by the Transport Minister of Uttarakhand. Mention the
permission only in the private reviewer notes (§4.6, §3.5), never in public listing text — it
would read as an endorsement.

---

## 2. Shared store text

### 2.1 Names and short texts

| Field | Limit | Text |
|---|---|---|
| App name (Play title / App Store name) | 30 | `Pahad Pulse` |
| App Store subtitle | 30 | `Uttarakhand data, sourced` |
| Play short description | 80 | `Independent app for Uttarakhand weather, alerts, roads and district data.` (75) |
| App Store promotional text | 170 | `Weather, air quality, alerts, road closures and district data for Uttarakhand — every figure linked to the public source that published it.` |
| App Store keywords | 100 | `Uttarakhand,weather,alerts,roads,landslide,AQI,earthquake,districts,tourism,Dehradun,public data` |

The current keyword draft in `APP_STORE_RELEASE.md` ends with `government data`; replace it with
`public data` as above.

### 2.2 Full description (use on both stores)

```
Pahad Pulse brings the public information people in Uttarakhand look for every day into one
clear, free app — weather, air quality, alerts, road closures and district data — with every
figure linked to the source that published it.

WHAT YOU CAN DO
• Weather and air quality for every district, with forecasts.
• Active weather and disaster alerts for the districts you follow, with optional notifications.
• Road closures and reopenings across the state, as reported by PWD divisions.
• Satellite fire detections, recent earthquakes and disaster events on an interactive map.
• District profiles: population, connectivity, tourism and development indicators.
• Trip Check: the conditions for a destination on the date you plan to travel.
• English and Hindi, light and dark themes, and recently loaded data available offline.

SOURCES
Information comes from publicly available data published by, among others, the India
Meteorological Department (IMD), NDMA SACHET, PWD Uttarakhand, Open-Meteo, USGS, NASA FIRMS,
GDACS and the Census of India. Each screen names its source, the date the data describes, and
links to the original.

AN INDEPENDENT APP
Pahad Pulse is an independent, non-commercial platform. It is not a government app and is not
affiliated with, endorsed by or operated by the Government of Uttarakhand, the Government of
India or any of their departments. It does not issue official warnings: for safety decisions,
always follow the issuing authority linked in the app.

PRIVACY
No account, no ads, no tracking. If you turn on alerts, the app stores only a notification
token, your platform and your language so it can send them; you can turn them off at any time.
Privacy policy: https://www.pahadpulse.live/privacy
```

### 2.3 Release notes for this release (Android 1.0.1 (8), iOS 1.0.2 (8))

Play limit 500 characters; App Store "What's New" 4,000. Use the same text:

```
• Road closures: see roads closed or partly reopened across Uttarakhand, and roads reopened in
  the last day, as reported by PWD divisions.
• Faster, more reliable data: the app now connects to our new servers in India.
• Security improvements to the map.
• Fixes: source links always shown; smoother cards on Android.
```

Hindi (Play allows per-language notes; add if you publish a Hindi listing):

```
• सड़क बंद होने की जानकारी: पूरे उत्तराखण्ड में बंद या आंशिक रूप से खुली सड़कें, और पिछले एक दिन में खुली सड़कें — PWD डिवीज़नों की रिपोर्ट के अनुसार।
• तेज़ और भरोसेमंद डेटा: ऐप अब भारत में स्थित हमारे नए सर्वर से जुड़ता है।
• मानचित्र की सुरक्षा में सुधार।
• सुधार: स्रोत लिंक हमेशा दिखते हैं; Android पर कार्ड बेहतर दिखते हैं।
```

### 2.4 URLs

| Field | URL |
|---|---|
| Privacy policy | `https://www.pahadpulse.live/privacy` (must open — see §0.1) |
| Support | `https://www.pahadpulse.live/support` |
| Marketing / website | `https://www.pahadpulse.live` |
| Contact email | `support@pahadpulse.live` once created (§0.2) |

---

## 3. Google Play

### 3.1 Technical requirements (checked against this build)

| Requirement | This app |
|---|---|
| Target API **36** (Android 16) for new apps and updates since **31 Aug 2026** | ✅ `targetSdk 36`, `compileSdk 36` (React Native 0.86) |
| Android App Bundle (.aab) | ✅ EAS `production` profile |
| Signed with the registered upload key | ✅ verified: SHA-256 `62:6B:34:7E:…:80:11` (`pahadpulse-upload.jks`) |
| `versionCode` higher than every uploaded build | ✅ 8 (skip the unused 7) |
| Package | ✅ `in.pahadpulse.app` |
| No unneeded sensitive permissions | ✅ location, "display over other apps" and storage are blocked in `app.config.ts` |

**Permissions the app requests** — check the list in Play Console → **App bundle explorer** after
upload. It should be limited to: `INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE`,
`POST_NOTIFICATIONS`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED` and Firebase messaging
(`com.google.android.c2dm.permission.RECEIVE`). If `com.google.android.gms.permission.AD_ID`
appears, answer the Advertising ID question as below rather than ignoring it.

### 3.2 Developer account

- **Personal account created after 13 Nov 2023:** production access needs a **closed test with
  at least 12 testers opted in for 14 consecutive days**. Internal testing does not count. Ask
  testers to actually open the app during those days; Google asks about tester feedback when you
  apply.
- **Organisation account:** the rule does not apply. If Pahad Pulse is already live in
  production, it does not apply either.
- Developer name shown on Play: **Pahad Pulse**. Keep the developer email and website consistent
  with §2.4.

### 3.3 Play Console → App content (Policy → App content)

| Declaration | Answer |
|---|---|
| **Privacy policy** | `https://www.pahadpulse.live/privacy` |
| **Ads** | No, the app does not contain ads |
| **App access** | All functionality is available without special access (no login) |
| **Content rating** (IARC questionnaire) | Category: *Reference, News, or Educational*. No violence, sexual content, profanity, drugs, gambling or user-generated content; no sharing of location; no user interaction. Expected rating: Everyone / 3+ |
| **Target audience** | **18 and over** (or 13+). Do **not** include under-13 age groups — that brings in the Families policy and its extra requirements |
| **News app** | **No.** It shows data and alerts, not editorial news. Answering yes triggers the news-publisher requirements |
| **Government apps** | **No** — not developed by or on behalf of a government |
| **Financial features** | None |
| **Health apps** | None |
| **Advertising ID** | No, the app does not use an advertising ID (if Play detects `AD_ID` in the manifest, say it comes from a library and is not used, or remove the permission) |
| **Data safety** | See §3.4 |

### 3.4 Data safety form

The app has no accounts, analytics, ads or crash-reporting SDKs. The server does not log IP
addresses. The only data stored is what a device sends when the user turns on alerts.

- **Does your app collect or share any of the required user data types?** Yes (one type).
- **Is all collected data encrypted in transit?** Yes (HTTPS only).
- **Do you provide a way for users to request that their data be deleted?** Yes — turning off
  alerts in the app deletes the token from the server.

| Data type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| **Device or other IDs** (push notification token) | Yes | No* | Yes — only if the user turns on alerts | App functionality |

\* Firebase Cloud Messaging and Expo deliver the notifications as service providers on our
behalf; Google's definition of "sharing" excludes service providers.

Everything else — location, personal info, contacts, photos, files, app activity, browsing
history, diagnostics — **Not collected**. Followed districts, language and theme stay on the
device and are never sent.

### 3.5 Store listing assets

| Asset | Requirement |
|---|---|
| App icon | 512 × 512 PNG, 32-bit, ≤ 1 MB |
| Feature graphic | 1024 × 500 JPG/PNG, no alpha. Show the app on a phone with the name — no emblems, no "official" |
| Phone screenshots | 2–8, 16:9 or 9:16, each side 320–3840 px. Suggested order: Today, Map, Road closures, Alerts, District detail, Trip Check |
| Category | **Weather** (closest Play category to the app's main use). Tags: Weather, Travel & Local |
| Contact details | Email (required), website `https://www.pahadpulse.live` |

Screenshots must be of the real app with real data. Do not add text such as "Official app",
"Govt approved" or "#1".

### 3.6 Reviewer notes (Play: **App content → App access → Instructions**, or the release notes field for reviewers if offered)

```
Pahad Pulse is an independent, free, non-commercial app. It is not affiliated with any
government. It displays publicly available information (weather, alerts, earthquakes,
satellite fire detections, statistics), each item linked to its publisher. No login is needed.
Road-closure data is shown with written permission from PWD Uttarakhand, approved by the
Transport Minister of Uttarakhand; a copy is available on request.
```

### 3.7 Releasing

1. Upload `app-release.aab` 1.0.1 (8) to **Closed testing** first if §3.2 applies, otherwise
   **Production**.
2. Paste the release notes from §2.3.
3. Use **staged rollout** at 20% for one or two days, check **Android vitals** for crashes,
   then raise to 100%.
4. Review usually takes 1–7 days. If rejected, the email names the policy — fix that one item
   and reply through the **Policy status** page rather than re-uploading blindly.

---

## 4. Apple App Store

### 4.1 Technical requirements

| Requirement | This app |
|---|---|
| Built with **Xcode 26 and the iOS 26 SDK** (required for uploads since 28 Apr 2026) | Archive with Xcode 26.x |
| Bundle ID | ✅ `in.pahadpulse.app` |
| Version / build | ✅ 1.0.2 (8) — 1.0.1 is already approved, so it cannot take new builds |
| Privacy manifest `PrivacyInfo.xcprivacy` with required-reason API declarations | ✅ generated by prebuild (file timestamp, UserDefaults, system boot time) |
| Export compliance | ✅ `ITSAppUsesNonExemptEncryption = false` — no encryption question at upload |
| iPhone only | ✅ `supportsTablet: false` — no iPad screenshots needed |
| No sign-in, so no Sign in with Apple and no account deletion requirement | ✅ |

**Archive steps:** `open mobile/ios/PahadPulse.xcworkspace` → destination **Any iOS Device
(arm64)** → **Product → Archive** → Organizer → check **1.0.2 (8)** → **Distribute App → App
Store Connect**. `ios/.xcode.env.local` must point at Node 24 (it does).

### 4.2 App Store Connect → App information

| Field | Value |
|---|---|
| Name / subtitle | §2.1 |
| Primary category | **Reference** |
| Secondary category | **Weather** |
| Content rights | "Yes, it contains, shows or accesses third-party content, and I have the necessary rights" — public data used under its publishers' terms, road closures with written permission |
| Age rating | Answer the updated questionnaire: **None** for every content type; no user-generated content, no messaging, no web browsing beyond links to source pages, no gambling, no medical/treatment information. Expected **4+** |

### 4.3 App Privacy (nutrition label)

- **Data used to track you:** None.
- **Data linked to you:** None.
- **Data not linked to you:** **Identifiers → Device ID** (the push notification token), purpose
  **App Functionality**. Collected only when the user turns on alerts.

Everything else — location, contact info, usage data, diagnostics — **not collected**.

### 4.4 Version page

| Field | Value |
|---|---|
| Promotional text, description, keywords | §2.1, §2.2 |
| What's New | §2.3 |
| Support URL / Marketing URL / Privacy policy URL | §2.4 |
| Screenshots | **6.9-inch** iPhone (1320 × 2868 or 1290 × 2796) required, 1–10 images; same order as Play |
| Copyright | `2026 Pahad Pulse` |

### 4.5 Availability and EU

Under the EU Digital Services Act, apps sold in the EU must declare **trader status** and, if a
trader, publish an address and phone number on the product page. Pahad Pulse is free and
non-commercial; the simplest path is to **set availability to India** (plus any non-EU
countries you want) and leave the EU out. Add the EU later once you decide on trader status.

### 4.6 App Review information

- **Sign-in required:** No.
- **Contact:** a team member's name, phone and the §2.4 email.
- **Notes** (paste):

```
Pahad Pulse is an independent, free, non-commercial app for people in Uttarakhand, India. It is
not affiliated with any government and says so in the app (Settings → About). It organises
publicly available information — weather and air quality (Open-Meteo), weather and disaster
alerts (NDMA SACHET), earthquakes (USGS), satellite fire detections (NASA FIRMS), disaster
events (GDACS) and district statistics (Census of India and state publications) — and every
item links to its publisher.

Road-closure data is shown with written permission from PWD Uttarakhand, approved by the
Transport Minister of Uttarakhand. A copy is attached.

No account is needed. Notifications are optional: the app asks before enabling alerts for the
districts a user follows, and the app works fully without them.
```

- **Attachment:** the signed permission document (PDF).

### 4.7 Guidelines this app is most likely to be checked against

| Guideline | Risk | How the app meets it |
|---|---|---|
| 2.3 Accurate metadata | Listing promising more than the app does | Description lists only features that exist; screenshots from the real app |
| 4.2 Minimum functionality | "Repackaged website" or "collection of links" | Native map, district following, alert notifications, offline data, Trip Check, Hindi — say so in the description |
| 4.5.4 Push notifications | Notifications required, or used for marketing | Optional, opt-in, alerts only, never promotions |
| 5.1.1 Privacy | Privacy link missing in app or console | Link in Settings and in App Store Connect — **must open** (§0.1) |
| 5.2.1 / 5.2.2 Third-party content | Implying official status; no permission for content | Independent disclaimer; sources linked; PWD permission attached |

---

## 5. Common rejection reasons and the answer to each

| Rejection | Store | Prevention |
|---|---|---|
| Privacy policy URL broken or not reachable | Both | Fix §0.1; open the link on a phone on mobile data before submitting |
| Impersonation / misleading government affiliation | Both | §1 rules; disclaimer in description and app; no emblems |
| Data safety / App Privacy doesn't match the app | Both | §3.4 and §4.3 exactly as written |
| Broken functionality during review | Both | Submit only Android 1.0.1 (8) / iOS 1.0.2 (8) or later (old builds called the suspended server); confirm `https://api.pahadpulse.live/ready` returns `{"status":"ready"}` on the day |
| Metadata spam (keywords in title, emojis, "best", competitor names) | Both | Title is only `Pahad Pulse` |
| Unjustified permissions | Play | Location, overlay and storage are blocked |
| Target API too low | Play | `targetSdk 36` |
| Missing closed-testing period | Play (new personal accounts) | §3.2 |
| Old Xcode / SDK | Apple | Xcode 26 |
| "Invalid Pre-Release Train … closed for new build submissions" | Apple | The version number is already approved — raise `version` in `app.config.ts` (and `MARKETING_VERSION` / `CFBundleShortVersionString` in `ios/`) |
| "Upload Symbols Failed … dSYM for React / ReactNativeDependencies / hermesvm" | Apple | Warning only, not a rejection: React Native ships these frameworks prebuilt without debug symbols. The upload still succeeds |
| Content rights questioned | Apple | §4.2 content rights, §4.6 attachment |

---

## 6. Submission checklist

**Before either store**
- [ ] Website running on Hostinger; `/privacy` and `/support` open (§0.1)
- [ ] Support email decided and updated on the site and in both consoles (§0.2)
- [ ] `https://api.pahadpulse.live/ready` returns ready
- [ ] Screenshots captured from this release with live data, including Road closures
- [ ] Signed PWD permission saved as PDF

**Google Play**
- [ ] AAB 1.0.1 (8) uploaded; App bundle explorer permissions match §3.1
- [ ] All App content declarations answered (§3.3, §3.4)
- [ ] Store listing text, graphics and contact details (§2, §3.5)
- [ ] Reviewer instructions (§3.6)
- [ ] Release notes (§2.3), staged rollout

**App Store**
- [ ] Disk space freed; archive 1.0.2 (8) with Xcode 26; uploaded
- [ ] App information, age rating, content rights (§4.2)
- [ ] App Privacy (§4.3)
- [ ] Version page, screenshots, What's New (§4.4)
- [ ] Availability set (§4.5)
- [ ] Review notes and permission attachment (§4.6)

---

## Sources

- Google Play — [Requirements for apps that communicate government information](https://support.google.com/googleplay/android-developer/answer/9514050?hl=en)
- Google Play — [Developer Program Policy](https://support.google.com/googleplay/android-developer/answer/18258653?hl=en) and [Deceptive Behavior](https://play.google.com/about/privacy-security-deception/deceptive-behavior/dishonest-behavior/)
- Google Play — [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
- Google Play — [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- Target API 36 deadline (31 Aug 2026): [DEV Community](https://dev.to/dainyjose/google-play-requires-android-16-api-level-36-by-august-31-2026-react-native-migration-guide-1d51), [Orange OMA](https://orangeoma.zendesk.com/hc/en-us/articles/21001579350172-Google-Play-s-Target-API-level-requirements-for-2026) — confirm on Play Console's target API page
- Apple — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Apple — Xcode 26 / iOS 26 SDK required from 28 Apr 2026: [Apple Developer Forums](https://developer.apple.com/forums/thread/806141), [summary](https://ptkd.com/journal/app-store-xcode-26-sdk-requirement) — confirm on Apple's *Upcoming Requirements* page
- Google Play shows a government badge only for verified official apps: [TechCrunch](https://techcrunch.com/2024/05/02/google-will-now-show-labels-in-play-store-to-denote-official-government-apps)
