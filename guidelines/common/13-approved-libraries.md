# 13 — Approved Libraries

The standard stack. Using something on this list needs no discussion. Using something not on
this list is a deliberate decision, logged in the module doc that introduces it and approved by
a tech lead.

---

## 1. Why a fixed list

Every extra dependency is a thing the whole team must learn, a thing that can break the build,
and a thing that must be patched. A shared list means an engineer moving between projects
already knows the tools.

---

## 2. Shared (all layers)

| Concern | Library | Notes |
|---|---|---|
| Language | `typescript` ^5.8 | strict mode, no exceptions |
| Schema & validation | `zod` ^4 | the only validation library |
| Date handling | `date-fns` ^4 | tree-shakeable; no `moment` |
| Linting | `eslint` ^9 + `typescript-eslint` ^8 | flat config |
| Formatting | `prettier` ^3 | + `prettier-plugin-tailwindcss` on web |
| Hooks | `husky` + `lint-staged` + `commitlint` | |

---

## 3. Backend

| Concern | Library | Notes |
|---|---|---|
| HTTP framework | `express` ^5 | |
| Result type | `neverthrow` ^8 | the error model depends on it |
| Postgres driver | `pg` ^8 | raw SQL, parameterised, pooled. PostGIS used through SQL, never a wrapper. |
| Logging | `winston` ^3 | JSON in prod |
| Auth | `jsonwebtoken` ^9 | always pass `algorithms` |
| Password hashing | `bcryptjs` ^3 | cost ≥ 12 |
| Rate limiting | `express-rate-limit` ^7 | |
| CORS | `cors` ^2 | allowlist only |
| Security headers | `helmet` ^8 | **add this — missing from the reference** |
| Cookies | `cookie-parser` ^1 | |
| File upload | `multer` ^2 | memory storage + explicit validation |
| Object storage | `@azure/storage-blob` ^12 | pick **one** provider per project |
| Email | `nodemailer` ^7 | |
| In-process cache | `node-cache` ^5 | single instance only; use Redis when scaled out |
| Env loading | `dotenv` ^17 | loaded only in `config/env.ts` |
| Testing | `jest` ^30 + `ts-jest` + `supertest` ^7 + `testcontainers` ^11 | |

**Deliberately not used:** an ORM (Prisma/TypeORM/Sequelize). We write raw parameterised SQL.
Changing that is a company-level decision, not a project one.

**Remove from any project that has them:** `nodemon` and `ts-node-dev` (use `tsx watch`),
`ts-node` (use `tsx`), `glob`/`rimraf` unless genuinely used, and any second storage provider
(the backend reference carries both Cloudinary and Azure Blob — pick one).

---

## 4. Web (Next.js)

| Concern | Library | Notes |
|---|---|---|
| Framework | `next` ^15 (App Router) | Pages Router is not used |
| UI runtime | `react` ^19, `react-dom` ^19 | |
| Server state | `@tanstack/react-query` ^5 | **all** server data goes through this |
| Client state | React state + Context | Redux needs a logged decision |
| Styling | `tailwindcss` ^4 | CSS-variable tokens, see `frontend/04` |
| Primitives | `@radix-ui/*` via **shadcn/ui** | `components/ui` is generated, not hand-written |
| Variants | `class-variance-authority`, `clsx`, `tailwind-merge` | `cn()` helper |
| Icons | `lucide-react` | the only icon set |
| Toasts | `sonner` | |
| Theming | `next-themes` | |
| Forms | React Hook Form + `@hookform/resolvers/zod` | see `frontend/06` |
| Docs / component workbench | `storybook` ^9 (`@storybook/nextjs-vite`) + `addon-a11y` | |
| Unit/integration testing | `vitest` ^3 + `@testing-library/react` + `jsdom` | |
| Network mocking | `msw` ^2 | |
| E2E | `cypress` ^15 | |

**Deliberately not used:** `axios` (use `fetch` via `apiClient`), `moment`, `lodash`
(use native + small helpers), CSS-in-JS runtimes, `redux-persist`.

> Also review: `use-deep-compare`, `use-deep-compare-effect`, `dequal`,
> `next-remove-imports`, `react-shimmer-effects` — most are avoidable. Prefer stable query
> keys over deep-compare hooks, and the shadcn `Skeleton` over a shimmer package.

---

## 5. Mobile (Expo + React Native)

| Concern | Library | Notes |
|---|---|---|
| Platform | `expo` (SDK 52+), managed workflow | bare workflow needs a logged decision |
| Runtime | `react-native`, `react` ^19 | version dictated by the Expo SDK |
| Navigation | `expo-router` | file-based, mirrors the Next.js App Router |
| Server state | `@tanstack/react-query` ^5 | same as web |
| Styling | `nativewind` ^4 | Tailwind classes on native |
| Primitives | `react-native-reusables` (shadcn for RN) | same component names as web |
| Icons | `lucide-react-native` | same icon set as web |
| Forms | React Hook Form + zod resolver | same as web |
| Storage | `expo-secure-store` (tokens), `@react-native-async-storage/async-storage` (cache) | never `AsyncStorage` for tokens |
| Animation | `react-native-reanimated` | |
| Gestures | `react-native-gesture-handler` | |
| Images | `expo-image` | |
| Lists | `@shopify/flash-list` | for anything over ~50 rows |
| Testing | `jest-expo` + `@testing-library/react-native` + `msw` | |
| E2E | `maestro` | Detox needs a logged decision |
| Build & release | `eas-cli` (EAS Build / Submit / Update) | |
| Crash reporting | `sentry-expo` | |

---

## 6. Adding a dependency

Log a decision entry in the module doc that introduces it, answering:

1. What problem does it solve, and which requirement needs it?
2. What did we consider from the approved list, and why is it insufficient?
3. Bundle/runtime cost (installed size, transitive deps, client bundle delta).
4. Maintenance signal: last release, open issues, single-maintainer risk.
5. Licence — MIT/Apache-2.0/BSD only. GPL/AGPL is blocked.
6. Security: `npm audit`, known CVEs.
7. Exit plan: how hard is it to remove?

Rejected by default: anything with < 1 year of history, a single maintainer and no
organisation behind it, or fewer than ~10k weekly downloads — unless it is trivially
vendorable.

---

## 7. Removing a dependency

Removing one is always a good PR. Check with `npx depcheck`, delete, run `npm run verify`,
merge. No decision entry needed to remove.
