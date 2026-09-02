# Frontend — 01 Folder Structure

Next.js 15 App Router + React 19 + TypeScript. **Feature-sliced**, not layered. The backend is
layered because its variance is technical; the frontend's variance is domain-shaped.

---

## 1. The tree

```
web/
├── src/
│   ├── app/                          # ROUTING ONLY. Thin. No business logic.
│   │   ├── layout.tsx                # root layout: fonts, providers, metadata
│   │   ├── provider.tsx              # client providers: QueryClient, Auth, Theme
│   │   ├── globals.css               # Tailwind import + design tokens
│   │   ├── page.tsx                  # /
│   │   ├── error.tsx                 # route-group error boundary
│   │   ├── not-found.tsx
│   │   ├── loading.tsx
│   │   ├── robots.ts
│   │   ├── sitemap.ts
│   │   │
│   │   ├── (public)/                 # route group — shared layout, no URL segment
│   │   │   ├── articles/[id]/page.tsx
│   │   │   ├── category/[category]/page.tsx
│   │   │   └── tags/[tag]/page.tsx
│   │   │
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   │
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── articles/page.tsx
│   │   │   └── articles/[id]/page.tsx
│   │   │
│   │   └── api/                      # BFF route handlers only (never business logic)
│   │
│   ├── features/                     # THE APPLICATION LIVES HERE
│   │   └── article/
│   │       ├── components/           # feature-specific UI (always plural)
│   │       │   ├── article-card.tsx
│   │       │   ├── article-card.stories.tsx
│   │       │   ├── article-card.test.tsx
│   │       │   └── article-form.tsx
│   │       ├── hooks/
│   │       │   ├── index.ts          # public surface: query/mutation hooks
│   │       │   └── use-create-article-form.ts
│   │       ├── services/
│   │       │   └── index.ts          # public surface: network calls
│   │       ├── queries.ts            # query-key factory
│   │       └── types.ts              # Zod schemas + inferred types
│   │
│   ├── components/                   # SHARED, feature-agnostic UI
│   │   ├── ui/                       # shadcn/ui primitives — GENERATED, don't hand-edit
│   │   │   ├── button.tsx
│   │   │   └── button.stories.tsx
│   │   ├── molecules/                # composed shared components
│   │   │   ├── header.tsx
│   │   │   ├── footer.tsx
│   │   │   ├── pagination-controls.tsx
│   │   │   └── confirm-dialog.tsx
│   │   └── layouts/
│   │       └── dashboard-layout.tsx
│   │
│   ├── hooks/                        # shared, feature-agnostic hooks
│   │   ├── use-media-query.ts
│   │   └── use-debounced-value.ts
│   │
│   ├── lib/                          # infrastructure, not UI
│   │   ├── api.ts                    # apiClient + RequestError
│   │   ├── query-client.ts
│   │   ├── logger.ts
│   │   └── utils.ts                  # cn() and true generic helpers only
│   │
│   ├── config/
│   │   ├── env.ts                    # Zod-validated NEXT_PUBLIC_* config
│   │   └── constants.ts              # STALE_TIME, PAGE_SIZE, ROUTES
│   │
│   ├── types/                        # cross-feature types & enums
│   │   ├── common.ts                 # Status, Category, Region, Paginated
│   │   ├── api.ts                    # envelope schemas
│   │   └── auth.ts
│   │
│   └── test/
│       ├── setup.tsx
│       ├── utils.tsx                 # custom render with providers
│       ├── factories/
│       └── mocks/
│           ├── handlers.ts           # MSW
│           └── server.ts
│
├── cypress/e2e/
├── .storybook/
├── public/
├── components.json                   # shadcn config
├── next.config.ts
├── vitest.config.ts
└── eslint.config.mjs
```

---

## 2. The four buckets — where does this file go?

```
Is it a URL?                          → src/app/
Does it belong to one business domain? → src/features/<domain>/
Is it UI used by 2+ domains?          → src/components/
Is it infrastructure (no JSX)?         → src/lib/ or src/config/
```

If you can't answer, it's probably feature code. **Default to `features/`** — promoting later
is easy, un-tangling a premature "shared" component is not.

---

## 3. `app/` is routing, not application

A page file should be under ~60 lines. Its job:

1. Read route params / search params.
2. Set metadata (SEO).
3. Compose feature components.
4. Nothing else.

```tsx
// src/app/(public)/tags/[tag]/page.tsx
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${tag} — Hills & Quills`, description: `Latest stories tagged ${tag}` };
}

export default async function TagPage({ params }: PageProps) {
  const { tag } = await params;
  return <ArticlesByTagSection tag={tag} />;
}
```

**Banned in `app/`:** `fetch` calls, Zod schemas, business rules, `useState` holding domain
data, styling beyond layout composition, anything over 60 lines.

> The reference has `src/app/admin/components/DashboardLayout.tsx` — a component inside the
> route tree. Shared layouts go in `src/components/layouts/`; the route folder holds
> `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, and route handlers only.

---

## 4. Feature anatomy

Every feature has the same five things. Fixed names, always plural `components/`.

| Path | Contains | Public? |
|---|---|---|
| `types.ts` | Zod schemas + inferred types for this domain | ✅ imported by other features |
| `services/index.ts` | one function per endpoint; throws `RequestError`; parses with Zod | ✅ |
| `queries.ts` | query-key factory | ✅ |
| `hooks/index.ts` | TanStack Query hooks — the primary surface for pages | ✅ |
| `components/*` | feature UI | ⚠️ only the top-level sections are meant for pages |

**A feature may import from another feature only through `types.ts`, `services/index.ts`, or
`hooks/index.ts`.** Never reach into `features/x/components/internal-thing.tsx`.

If two features need the same component, promote it to `components/molecules/`. If they need
the same *logic*, promote it to `hooks/` or `lib/`.

---

## 5. `components/` tiers

| Tier | What | Rules |
|---|---|---|
| `ui/` | shadcn/Radix primitives | Generated by `npx shadcn add`. Edit only to change project-wide styling. Never add business logic. |
| `molecules/` | Shared composed components (header, footer, pagination, confirm dialog, badges) | Presentational. Props in, callbacks out. **No data fetching.** |
| `layouts/` | Page chrome shared across routes | Composition only. |

Everything in `components/` is **presentational**: it receives data via props and reports
events via callbacks. The moment a shared component calls a hook that fetches, it belongs in a
feature.

---

## 6. Import rules

```
app/         → features/, components/, lib/, config/, types/
features/x/  → components/, hooks/, lib/, config/, types/, features/y (public surface only)
components/  → components/, hooks/, lib/, types/          (NEVER features/)
hooks/       → lib/, types/
lib/         → lib/, types/, config/
types/       → types/ only
```

`components/` importing from `features/` is the most common structural mistake and is a
blocking review comment — it makes the shared component un-shareable.

Enforced:

```js
'import/no-restricted-paths': ['error', {
  zones: [
    { target: './src/components', from: './src/features', message: 'Shared components must not depend on features.' },
    { target: './src/lib',        from: './src/features' },
    { target: './src/lib',        from: './src/components' },
    { target: './src/hooks',      from: './src/features' },
    { target: './src/types',      from: './src' },
  ],
}],
```

Always import via the `@/` alias. Relative imports only within the same folder.

---

## 7. File colocation

```
article-card.tsx                 component
article-card.stories.tsx         Storybook — required for every exported component
article-card.test.tsx            unit test
article-card.integration.test.tsx  integration test (real hook + MSW)
```

Four files, one concept, one folder. Never a parallel `__tests__/` mirror tree — it guarantees
tests get orphaned when files move.

---

## 8. Adding a new feature — checklist

1. `features/<domain>/types.ts` — Zod schemas first, types inferred.
2. `features/<domain>/services/index.ts` — one function per endpoint.
3. `features/<domain>/queries.ts` — key factory.
4. `features/<domain>/hooks/index.ts` — query/mutation hooks.
5. `features/<domain>/components/` — UI + stories + tests.
6. `app/.../page.tsx` — thin route that composes the feature.
7. MSW handlers in `src/test/mocks/handlers.ts`.
8. Cypress spec if it's a critical journey.

---

## 9. Forbidden

- A new top-level folder under `src/` without a logged decision.
- `utils/`, `helpers/`, `common/`, `shared/` as folder names — name the concern.
- Components inside `app/` beyond Next.js's own special files.
- `components/` importing `features/`.
- Deep imports into another feature's internals.
- Barrel files that re-export entire folders (breaks tree-shaking and creates cycles). The
  only barrels are a feature's `hooks/index.ts` and `services/index.ts`.
- Duplicated components across features (the reference duplicates
  `delete-confirmation-dialog` and `rejection-reason-dialog` — promote them).
