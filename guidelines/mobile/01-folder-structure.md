# Mobile — 01 Folder Structure

Same feature-sliced architecture as the web app. `app/` is Expo Router instead of Next.js App
Router — the file-based routing concept is deliberately near-identical.

---

## 1. The tree

```
mobile/
├── app/                              # Expo Router. ROUTING ONLY.
│   ├── _layout.tsx                   # root layout: providers, fonts, splash
│   ├── +not-found.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx               # tab bar
│   │   ├── index.tsx                 # Home
│   │   ├── explore.tsx
│   │   └── profile.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── articles/
│   │   └── [id].tsx
│   └── modal/
│       └── filters.tsx
│
├── src/
│   ├── features/                     # THE APPLICATION LIVES HERE (same as web)
│   │   └── article/
│   │       ├── components/
│   │       ├── hooks/index.ts
│   │       ├── services/index.ts
│   │       ├── queries.ts
│   │       └── types.ts
│   │
│   ├── components/
│   │   ├── ui/                       # react-native-reusables primitives
│   │   ├── molecules/
│   │   └── layouts/
│   │
│   ├── hooks/                        # shared: use-app-state, use-network-status
│   ├── lib/
│   │   ├── api.ts
│   │   ├── query-client.ts
│   │   ├── storage.ts                # SecureStore + AsyncStorage wrappers
│   │   └── utils.ts
│   ├── config/
│   │   ├── env.ts                    # EXPO_PUBLIC_* validated with Zod
│   │   └── constants.ts
│   ├── types/
│   └── test/
│       ├── setup.ts
│       ├── utils.tsx
│       ├── factories/
│       └── mocks/
│
├── assets/
│   ├── images/
│   └── fonts/
├── e2e/                              # Maestro flows
│   └── login.yaml
├── app.config.ts                     # Expo config (dynamic, reads env)
├── eas.json                          # build/submit profiles
├── metro.config.js
├── tailwind.config.js                # NativeWind requires the JS config
├── global.css                        # NativeWind token layer
└── tsconfig.json
```

**`app/` at the repository root, application code under `src/`.** Expo Router requires `app/`
at the root (or configured); keeping everything else in `src/` preserves the same mental model
as the web repo.

---

## 2. `app/` is routing, not application

Identical rule to the web: a route file reads params, sets screen options, and renders one
feature component. ≤ 60 lines.

```tsx
// app/articles/[id].tsx
import { Stack, useLocalSearchParams } from 'expo-router';

import { ArticleDetailScreen } from '@/features/article/components/article-detail-screen';

export default function ArticleRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: 'Article' }} />
      <ArticleDetailScreen articleId={Number(id)} />
    </>
  );
}
```

Banned in `app/`: `fetch`, Zod schemas, business rules, styling beyond layout, anything over
60 lines. Route files are the **only** place default exports are allowed (Expo Router requires
them).

---

## 3. Route groups and file conventions

| Convention | Meaning |
|---|---|
| `(group)/` | groups routes under a shared layout without adding a URL segment |
| `[param].tsx` | dynamic segment |
| `[...rest].tsx` | catch-all |
| `_layout.tsx` | layout for the folder (Stack, Tabs, Drawer) |
| `+not-found.tsx` | 404 |
| `+html.tsx` | web target only |

Standard groups: `(tabs)` for the authenticated main app, `(auth)` for unauthenticated
screens, `modal/` for modal presentations.

---

## 4. Feature anatomy — identical to web

```
src/features/article/
  types.ts             Zod schemas + inferred types
  services/index.ts    one function per endpoint, throws RequestError
  queries.ts           query-key factory
  hooks/index.ts       TanStack Query hooks
  components/          screens + presentational components
```

Cross-feature imports only through `types.ts`, `services/index.ts`, `hooks/index.ts`. Never
reach into another feature's `components/`.

**A "screen" is just a feature component** named `<thing>-screen.tsx`. It lives in the feature,
not in `app/`. This is what keeps route files thin and screens testable without a navigator.

---

## 5. Shared code sourced from the web app

Where a project ships both web and mobile, these should be **identical files**, ideally in a
shared package (`packages/shared`) once the monorepo exists:

- `features/*/types.ts` — Zod schemas and domain types
- `features/*/services/index.ts` — API calls (platform-agnostic `fetch`)
- `features/*/queries.ts` — query keys
- `types/common.ts` — `Status`, `Category`, `Region`, `Paginated`
- `types/api.ts` — envelope schemas
- Error codes

**Not shared:** anything that renders, anything touching storage, anything touching navigation.

Until a monorepo exists, duplicate these files verbatim and keep them in sync in the same PR.
Divergence between the web and mobile schema is a production incident waiting to happen.

---

## 6. Path aliases

One alias, same as web:

```jsonc
// tsconfig.json
"paths": { "@/*": ["./src/*"] }
```

Mirror it in `babel.config.js` (`module-resolver`) or rely on Expo's built-in support, and in
`jest.config.js` `moduleNameMapper`. Three places, one commit.

---

## 7. Assets

```
assets/
  images/        icon.png, splash.png, adaptive-icon.png, in-app images
  fonts/         self-hosted font files
```

Referenced through `require('@/assets/...')` or `expo-image`'s `source`. Icon and splash are
configured in `app.config.ts`. Remote images always go through `expo-image`.

---

## 8. Configuration files

| File | Purpose |
|---|---|
| `app.config.ts` | Expo config as TypeScript, so it can read env and vary per build profile |
| `eas.json` | `development` / `preview` / `production` build + submit profiles |
| `metro.config.js` | NativeWind wiring, custom resolvers |
| `tailwind.config.js` | required by NativeWind (unlike Tailwind v4 on web) |
| `global.css` | token layer, imported once in the root layout |

Use `app.config.ts`, not `app.json` — a static JSON file can't vary the bundle ID, app name, or
API URL per environment, which you will need on day two.

---

## 9. Adding a feature — checklist

1. `src/features/<domain>/types.ts` (copy from web if it exists).
2. `services/index.ts` (copy from web).
3. `queries.ts` (copy from web).
4. `hooks/index.ts` — same hooks, plus offline considerations.
5. `components/<thing>-screen.tsx` + presentational components.
6. `app/...` route file, ≤ 60 lines.
7. Deep-link path registered and tested.
8. MSW handlers + RNTL tests.
9. Maestro flow if it's a critical journey.

---

## 10. Forbidden

- Screens implemented inside `app/`.
- A new top-level folder without a logged decision.
- `utils/`, `helpers/`, `shared/` as folder names.
- `components/` importing `features/`.
- Deep imports into another feature.
- Platform forks by whole file (`*.ios.tsx` / `*.android.tsx`) for anything but a genuinely
  platform-specific primitive — use `Platform.select` for small differences.
- Divergent copies of a schema that also exists on web.
