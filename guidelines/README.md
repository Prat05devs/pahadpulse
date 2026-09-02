# BasicTech Engineering Guidelines — Index

Read `common/` first. Then read the folder for the layer you are touching.

---

## common/ — applies to every layer

| File | Covers |
|---|---|
| [01-engineering-principles.md](common/01-engineering-principles.md) | The 12 principles that decide anything this index doesn't |
| [02-typescript-language-rules.md](common/02-typescript-language-rules.md) | tsconfig, banned constructs, Zod, modules, aliases |
| [03-naming-and-conventions.md](common/03-naming-and-conventions.md) | Files, identifiers, DB, routes, env vars, git, comments |
| [04-error-model.md](common/04-error-model.md) | `RequestError`, `neverthrow`, the `ERRORS` registry, envelopes |
| [05-logging-and-observability.md](common/05-logging-and-observability.md) | Winston, levels, request IDs, redaction, health checks |
| [06-api-contract.md](common/06-api-contract.md) | Envelope, URLs, pagination, validation, auth, versioning |
| [07-security.md](common/07-security.md) | Secrets, injection, authN/authZ, headers, uploads, deps |
| [08-code-quality.md](common/08-code-quality.md) | Definition of done, complexity limits, ESLint, hooks, CI |
| [09-testing-strategy.md](common/09-testing-strategy.md) | The pyramid, coverage bar, factories, mocking policy |
| [10-tooling-and-config.md](common/10-tooling-and-config.md) | Required files, npm scripts, Docker, CI/CD, environments |
| [11-environment-and-configuration.md](common/11-environment-and-configuration.md) | Zod-validated env, `.env.example`, client config, flags |
| [12-git-and-review.md](common/12-git-and-review.md) | Branching, commits, PRs, review responsibilities |
| [13-approved-libraries.md](common/13-approved-libraries.md) | The standard stack; how to add or remove a dependency |
| [14-documentation.md](common/14-documentation.md) | What to document, README structure, generated docs, decision records |
| [15-known-deviations.md](common/15-known-deviations.md) | Where the reference repos disagree with this guideline |

---

## backend/ — Express + TypeScript + MySQL

| File | Covers |
|---|---|
| [01-folder-structure.md](backend/01-folder-structure.md) | The layered tree, what belongs where, adding a domain |
| [02-high-level-design.md](backend/02-high-level-design.md) | Architecture, request lifecycle, caching tiers, scaling |
| [03-low-level-design.md](backend/03-low-level-design.md) | Model / repository / controller / route / middleware skeletons |
| [04-api-design.md](backend/04-api-design.md) | Endpoint inventory, route order, validation, pagination, uploads |
| [05-database.md](backend/05-database.md) | Pool, schema conventions, migrations, query rules, transactions |
| [06-error-and-logging.md](backend/06-error-and-logging.md) | Error production per layer, the error handler, log placement |
| [07-code-quality.md](backend/07-code-quality.md) | Layer enforcement, good/bad examples, anti-patterns, build config |
| [08-testing.md](backend/08-testing.md) | Jest config, unit tests per layer, Testcontainers integration |
| [09-security.md](backend/09-security.md) | Middleware baseline, JWT, authZ, IDOR, uploads, rate limits |
| [10-performance-and-caching.md](backend/10-performance-and-caching.md) | Budgets, indexes, payloads, cache tiers, pool tuning, timeouts |
| [11-build-and-deployment.md](backend/11-build-and-deployment.md) | Build, Docker, migrations in the pipeline, shutdown, ops |
| [12-pagination.md](backend/12-pagination.md) | Cursor pagination: contract, `limit + 1`, indexing, composite cursors, tests |

---

## frontend/ — Next.js App Router + React 19

| File | Covers |
|---|---|
| [01-folder-structure.md](frontend/01-folder-structure.md) | Feature-sliced tree, the four buckets, import rules |
| [02-high-level-design.md](frontend/02-high-level-design.md) | Layers, server vs client components, state taxonomy, rendering |
| [03-low-level-design.md](frontend/03-low-level-design.md) | types / api client / service / query keys / hooks / components |
| [04-ui-and-design-system.md](frontend/04-ui-and-design-system.md) | Tokens, shadcn, `cva`, `cn()`, responsive, images, motion |
| [05-state-and-data-fetching.md](frontend/05-state-and-data-fetching.md) | TanStack Query config, keys, mutations, URL state, prefetch |
| [06-forms-and-validation.md](frontend/06-forms-and-validation.md) | RHF + Zod, error messages, server errors, complex fields |
| [07-code-quality.md](frontend/07-code-quality.md) | Component/hook/render rules, Next rules, ESLint, anti-patterns |
| [08-testing.md](frontend/08-testing.md) | Vitest, RTL, query priority, MSW, integration, Cypress |
| [09-storybook.md](frontend/09-storybook.md) | Story anatomy, required stories, a11y gate, visual regression |
| [10-performance-and-seo.md](frontend/10-performance-and-seo.md) | Budgets, rendering strategy, bundle, images, metadata, JSON-LD |
| [11-accessibility.md](frontend/11-accessibility.md) | WCAG 2.2 AA, semantics, focus, forms, live regions, testing |

---

## mobile/ — Expo + React Native

> **Start with [00-read-this-first.md](mobile/00-read-this-first.md).** Most React rules are
> inherited from `frontend/`; these files document only the differences.

| File | Covers |
|---|---|
| [00-read-this-first.md](mobile/00-read-this-first.md) | The reuse rule and what's genuinely different |
| [01-folder-structure.md](mobile/01-folder-structure.md) | Expo Router tree, feature anatomy, shared code with web |
| [02-high-level-design.md](mobile/02-high-level-design.md) | Lifecycle, network reality, storage tiers, versioning, OTA |
| [03-low-level-design.md](mobile/03-low-level-design.md) | Route / screen / component skeletons, lists, safe areas |
| [04-ui-and-design-system.md](mobile/04-ui-and-design-system.md) | NativeWind, shared tokens, RN gotchas, dark mode |
| [05-navigation.md](mobile/05-navigation.md) | Expo Router, auth gating, params, deep links, modals, back button |
| [06-data-offline-and-storage.md](mobile/06-data-offline-and-storage.md) | Cache persistence, offline matrix, mutation queue, SecureStore |
| [07-code-quality.md](mobile/07-code-quality.md) | RN ESLint rules, anti-patterns, platform parity, done criteria |
| [08-testing.md](mobile/08-testing.md) | jest-expo, RNTL, MSW, Maestro, the manual matrix |
| [09-performance.md](mobile/09-performance.md) | Lists, images, re-renders, animations, startup, JS thread |
| [10-accessibility.md](mobile/10-accessibility.md) | RN a11y props, VoiceOver/TalkBack, testing |
| [11-build-and-release.md](mobile/11-build-and-release.md) | app.config, EAS profiles, versioning, OTA vs store, rollout |

---

## Quick answers

| Question | File |
|---|---|
| Where does this file go? | `<layer>/01-folder-structure.md` |
| What do I name it? | `common/03-naming-and-conventions.md` |
| How do I return an error? | `common/04-error-model.md` |
| What does this endpoint look like? | `common/06-api-contract.md` + `backend/04` |
| How do I paginate a list? | `backend/12-pagination.md` |
| Can I use library X? | `common/13-approved-libraries.md` |
| What tests do I need? | `common/09` + `<layer>/08-testing.md` |
| Is this secure? | `common/07-security.md` + `backend/09-security.md` |
| Why is the reference repo different? | `common/15-known-deviations.md` |
| When am I done? | `common/08-code-quality.md` §1 |
