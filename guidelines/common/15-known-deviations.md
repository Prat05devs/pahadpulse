# 15 — Known Deviations in the Reference Repos

`hills-quills-backend` and `hills-quills-frontend` are the reference implementations for
*structure and patterns*. They predate this guideline in several places. **Where they
disagree with the guideline, the guideline wins.**

This file exists so that an engineer (or agent) copying from the reference does not copy a
known problem. Each item lists the fix.

---

## Backend

| # | Deviation | Fix | Severity |
|---|---|---|---|
| B1 | `errorHandler` is imported in routers but **never registered** in `app.ts`; only `notFoundHandler` is mounted. Errors passed to `next()` fall through to Express's default handler and leak stack traces. | Register `app.use(errorHandler)` as the **last** middleware. | Critical |
| B2 | `error.middleware.ts` logs the full `req.body` on every error — which logs plaintext passwords from failed logins. | Log `Object.keys(req.body)` only, plus a redaction format. | Critical |
| B3 | Unknown errors return `error.message` when `NODE_ENV !== 'production'`. | Never echo an unknown error's message; return the generic message + `requestId`. | High |
| B4 | `validateRequest` calls `next(ERRORS.X)` **without returning**, then calls `next()` again — double `next()`. | `return next(...)` on the first failure. | Critical |
| B5 | `validateRequest` discards the parsed value; handlers re-`parse()`. `articles.route.ts` even validates with `GET_PAGINATED_ARTICLES` and then parses with `GET_PUBLISHED_ARTICLES`. | Attach `req.validated` and consume it. | High |
| B6 | `params` are never validated (`req.params.category` used raw). | Add `params` schemas to every parameterised route. | High |
| B7 | `CREATE_ARTICLE` takes `authorId` from the request body — an IDOR: any author can create content as another. | Take the actor from `req.user.sub`. | Critical |
| B8 | `config/env.ts` uses `!` non-null assertions; missing config fails at request time, not startup. | Zod-validated `env` object, `process.exit(1)` on failure. | High |
| B9 | Winston writes to `error.log` at level `debug`, and the file is committed. | Console transport only; JSON in prod; gitignore and delete the file. | High |
| B10 | `console.log` used in `app.ts`, `db.ts`, and `utils/error.ts`. | Use the logger. Enable `no-console`. | Medium |
| B11 | ESLint disables `no-explicit-any` and `no-unused-vars`. | Enable both as `error`; add type-aware rules. | High |
| B12 | `database/db_data/` (a full Postgres data dir, including `*.pem` private keys) is present in the repo tree. | Named Docker volume; gitignore; purge from history and rotate any real keys. | Critical |
| B13 | Both `package-lock.json` and `yarn.lock` are committed. | Keep `package-lock.json`, delete `yarn.lock`. | Medium |
| B14 | `Dockerfile` uses `npm install`, copies all source, runs as root, and starts `npm run dev`. | Multi-stage build, `npm ci`, `USER node`, `node dist/app.js`. | High |
| B15 | `testcontainers`, `ts-node`, `nodemon`, `ts-node-dev` are in `dependencies`, not `devDependencies`. | Move to `devDependencies`; drop `nodemon`/`ts-node-dev` in favour of `tsx watch`. | Medium |
| B16 | No `helmet`, no `trust proxy`, no request-ID middleware. | Add all three. | High |
| B17 | `express.json({ limit: '10mb' })` applied globally. | 1mb globally; larger limit only on the upload route. | Medium |
| B18 | Folder is `src/controller/` (singular) while siblings are plural. | Rename to `controllers/`. | Low |
| B19 | Route mounted at `/api/web_stories` (snake_case). | `/api/web-stories`. | Low |
| B20 | Two storage providers wired (Cloudinary **and** Azure Blob). | Pick one per project; delete the other. | Medium |
| B21 | `cacheMiddleware` keys on `req.originalUrl` with no auth/user dimension — an authenticated response can be served to another user. | Only cache public GETs; include a user/role dimension in the key, or skip caching when `Authorization` is present. | Critical |
| B22 | `cacheMiddleware` caches error responses too (it wraps `res.json` unconditionally). | Only cache 2xx responses. | High |
| B23 | Integration tests live in `src/__tests__/integration/*.ts` without a `.test.ts` suffix, so the default Jest pattern may not pick them up. | Name them `*.test.ts`. | Low |
| B24 | `tsconfig.json` has `noEmit: true` but `package.json` `build` runs `tsc` and `start` runs `dist/app.js`. The build produces nothing. | Separate `tsconfig.build.json` with `outDir: dist`, `noEmit: false`. | High |
| B25 | Password minimum is 6 characters. | Minimum 12, with a common-password check. | Medium |
| B26 | `01-tables.sql` has a syntax error (`rejection_reason TEXT;` inside `CREATE TABLE web_stories`), and no `FOREIGN KEY` constraints are declared. | Fix the statement; add FKs with explicit `ON DELETE` behaviour; move to numbered migrations. | High |

---

## Frontend

| # | Deviation | Fix | Severity |
|---|---|---|---|
| F1 | `apiClient.request` wraps everything in `try/catch` and rethrows `new RequestError(msg, 0, 500)`, destroying the real error code and HTTP status from the server. | Don't catch-and-rewrap. Let `RequestError` propagate; map only genuine network failures. | Critical |
| F2 | Auth token stored in `localStorage` — readable by any XSS. | httpOnly + Secure + SameSite cookie for the refresh token; access token in memory. | High |
| F3 | The response envelope typed in `api.ts` (`{data, message, code}`) does not match what the backend sends (`{success, message, data, pagination, timestamp}`). | Share one envelope schema; parse it with Zod. | High |
| F4 | Services call `ArticleSchema.parse(item)` on `(item: any)`. | Parse the whole envelope with `paginatedEnvelope(ArticleSchema)`; no `any`. | Medium |
| F5 | ESLint disables `no-explicit-any`, `no-unused-vars`, and `react/no-unescaped-entities`. | Enable them. | High |
| F6 | Both `.prettierrc` and `.prettierrc.json` exist. | Keep one. | Low |
| F7 | Both `@reduxjs/toolkit`/`react-redux` and TanStack Query are installed — two state systems. | TanStack Query for server state; React state/Context for UI state. Remove Redux or log the decision. | Medium |
| F8 | Both `package-lock.json` and `yarn.lock` are committed. | Keep `package-lock.json`. | Medium |
| F9 | Feature folders use `component/` (singular) in `article`/`web-story` but `components/` in `auth`/`author`. | Standardise on `components/`. | Low |
| F10 | Typos in filenames: `article-card-reactangle-horizontal.tsx`, `article-card-square-hotizontal.tsx`, `useMoreArtciles.ts`. | Rename. | Low |
| F11 | `delete-confirmation-dialog.tsx` and `rejection-reason-dialog.tsx` are duplicated across `article` and `web-story` features. | Promote to `components/molecules/` with props. | Medium |
| F12 | `src/app/page.tsx` is `'use client'` and fetches everything client-side — a news homepage that should be server-rendered for SEO and LCP. | Fetch in a Server Component, hydrate TanStack Query, keep only interactive leaves as client components. | High |
| F13 | `next.config.ts` uses the deprecated `images.domains`. | Use `images.remotePatterns` only. | Low |
| F14 | No security headers / CSP configured. | Add `headers()` in `next.config.ts` with CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. | High |
| F15 | `console.log('fetching top articles')` left in `services/index.ts`. | Remove; enable `no-console`. | Low |
| F16 | Components hardcode fallback content (`TrendingTagsView`'s Uttarakhand tag list) — business data inside a presentational component. | Pass fallbacks in as props or resolve them in the hook. | Medium |
| F17 | `TrendingTagsView` reassigns its own prop (`trendingTags = fallbackTags`). | Derive a new local value; enable `no-param-reassign`. | Low |
| F18 | Query keys are bare strings (`['topNews']`) with no factory. | Use a per-feature `articleKeys` query-key factory. | Medium |
| F19 | `tailwind.config.js` exists alongside Tailwind v4 CSS-first `@theme` config. | Tailwind v4 configures in CSS; remove the JS config unless a plugin needs it. | Low |
| F20 | `doc/` holds PNG screenshots as documentation. | Storybook is the component doc; keep screenshots only in PR descriptions. | Low |

---

## How to use this file

- **New project:** none of these should ever appear. Start from the guideline.
- **Existing project:** treat Critical and High items as a hardening backlog. One item per PR.
- **Copying a pattern from the reference:** check this table first.
