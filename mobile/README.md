# Pahad Pulse — Mobile

The iOS and Android app for the Pahad Pulse portal. Same data, same sources, same promise:
**every figure shows the department that published it, the date it describes, and how fresh
it is.**

Expo SDK 57 · React Native 0.86 · React 19.2 · TypeScript (strict) · Expo Router ·
TanStack Query · Zustand · Zod.

---

## Running it

```bash
npm install
cp .env.example .env      # then point EXPO_PUBLIC_API_URL at your API
npm run dev               # press i for iOS, a for Android
```

The API must be reachable from the device, which is the usual first-run trap:

| Running on | `EXPO_PUBLIC_API_URL` |
|---|---|
| iOS simulator | `http://localhost:3000/api` |
| Android emulator | `http://10.0.2.2:3000/api` |
| A physical phone | `http://<your-machine-LAN-IP>:3000/api` |

Before pushing anything:

```bash
npm run typecheck && npm run lint && npm test
```

---

## How the code is arranged

Two ideas stacked on each other. **Feature slices** decide *what* code is about;
**atomic design** decides *how small* a piece of UI is.

```
src/
├── app/                    Expo Router. ROUTING ONLY — no screen lives here.
│   ├── _layout.tsx         providers + root stack
│   ├── (tabs)/             Today · Districts · Alerts · More
│   ├── districts/[slug].tsx
│   ├── alerts/[id].tsx
│   └── settings.tsx
│
├── components/             Feature-agnostic UI. Knows nothing about districts or alerts.
│   ├── atoms/              Text · Card · Badge · Icon · Pressable · Skeleton · Stack
│   ├── molecules/          StatTile · ListRow · SourceNote · Chip · states · QueryBoundary
│   └── templates/          Screen · AppProviders · AppShell
│
├── features/               THE APPLICATION LIVES HERE. One folder per domain.
│   ├── areas/              districts, tehsils
│   ├── alerts/             warnings and their severity
│   ├── weather/            observations and forecast
│   ├── indicators/         statistical figures
│   ├── dashboard/          the Today screen
│   └── settings/           preferences, More
│
├── stores/                 Zustand. CLIENT state only.
├── lib/                    api · query-client · storage · format
├── theme/                  tokens · fonts · ThemeProvider
├── config/                 env (Zod-validated) · constants
├── types/                  shapes shared by every endpoint
└── test/                   setup and render helpers
```

### The rules that keep it that way

1. **A route file is under 20 lines.** It reads params and renders one feature component.
   Screens live in `features/<domain>/components/<thing>-screen.tsx` so they can be tested
   without a navigator.
2. **`components/` never imports `features/`.** The dependency runs one way. An atom that
   knows what an alert is has stopped being reusable.
3. **Features talk through their `index.ts`.** Never reach into another feature's
   `components/`. ESLint blocks it.
4. **Server data lives in TanStack Query. Client data lives in Zustand.** Never both.
5. **No raw colours, spacings or font sizes.** Everything comes from `theme/`.
6. **Validate at the boundary.** Every response is parsed with Zod before a component sees it.

### Atoms, molecules, organisms

- An **atom** takes no domain type. `<Badge label="Severe" />`.
- A **molecule** combines atoms and may take a shared type such as `Provenance`.
  `<SourceNote provenance={...} />`.
- An **organism** knows a domain type and lives inside its feature, not in `components/`.
  `<AlertCard alert={...} />` is in `features/alerts/components/`.

If you are unsure, ask whether the piece would still make sense in a different app. Yes means
`components/`. No means the feature.

---

## Adding a feature

The web portal already has hydromet, roads, tourism, migration, connectivity, seismic and
comparison. Each is the same six steps. Copying `features/weather/` is the fastest start.

1. `features/<domain>/schemas.ts` — **copy the file from `web/src/features/<domain>/`**.
   Keep it identical. A schema that has drifted between web and mobile means one of the two
   clients is silently rejecting valid data.
2. `services.ts` — one function per endpoint, calling `apiClient`. No React.
3. `queries.ts` — a key factory, so related keys share a prefix and invalidate together.
4. `hooks.ts` — `useQuery` wrappers. Pick the staleness window honestly:
   `STALE_TIME.live` for safety information, `hourly` for readings, `reference` for figures
   with a vintage in years.
5. `components/<thing>-screen.tsx` plus any organisms.
6. `index.ts` — export the public surface, then a route file in `src/app/`.

Write the tests in the same change. Schema parsing and anything that formats a number for a
reader are the two places bugs actually reach production.

---

## Things that are the way they are for a reason

**Typography is bundled, never inherited.** Left to the OS, iOS renders San Francisco and
Android renders Roboto. Their metrics differ, so the same card is a different height on each,
labels wrap on one platform only, and tile grids stop lining up. Noto Sans and Noto Sans
Devanagari are shipped with the app, and the splash screen is held until they load.

Two rules follow from that, both in `theme/fonts.ts`:

- **One font family per weight.** Android does not synthesise weights for a custom font, so
  `fontWeight: '700'` is silently ignored and headings render regular. Weight is carried by
  the family name instead. Use `<Text weight="semibold">`, never `fontWeight`.
- **`includeFontPadding: false` on Android.** Android reserves extra vertical space around
  every line that iOS does not. This is the single most common reason a layout looks right on
  one platform and cramped on the other.

**The API date formats are not ISO-8601.** `vintage` is `YYYY-MM-DD` — the date a figure
*describes*. `fetchedAt` is `YYYY-MM-DD HH:mm:ss` in UTC — when we *retrieved* it. Typing
either as `z.string().datetime()` makes every response fail validation. Parse timestamps with
`parseUtc`, which appends the zone explicitly; without it some engines read them as local
time and every "2 hours ago" is 5½ hours wrong.

**A failed parse is an error, not an empty screen.** The web app once wrapped these in
`.catch(() => null)` and shipped panels that had rendered nothing for weeks. `apiClient`
throws an `ApiError` naming the endpoint instead.

**Offline is a first-class state.** The query cache is persisted to AsyncStorage for a week,
so a reader in a valley with no signal still sees the district page they opened yesterday.
`ErrorState` distinguishes offline from a slow server from a real failure, because on a phone
those need different words and different recovery.

**Optional fields are deliberate.** An install stays on someone's phone for months and will
meet an API that has moved on. Fields added after launch are `.optional()` so a new response
shape does not reject the whole payload over one absent key.

---

## Environment

Only `EXPO_PUBLIC_*` variables reach the bundle, and **anything there ships inside the app
and is readable by anyone who downloads it.** Never put a secret in `.env`. The Pahad Pulse
API is public and unauthenticated, which is the only reason a bare base URL is safe.

`src/config/env.ts` is the one file allowed to read `process.env`, enforced by ESLint, and it
validates with Zod at startup so a bad URL fails loudly instead of turning every screen into
a network error.

---

## Builds

`app.config.ts` produces three apps from one codebase, selected by `APP_VARIANT`. Bundle
identifiers differ per variant so development, preview and production installs coexist on one
device.

```bash
eas build --profile development   # dev client
eas build --profile preview       # internal testers
eas build --profile production    # store
```

`runtimeVersion` follows `appVersion`, so a JS-only fix can ship over the air to everyone on
a given store build, while anything touching native code needs a new store release.
