# 03 — Naming & Conventions

Naming is the cheapest form of documentation. It is also the thing that makes a stranger's
repo navigable in 30 seconds. These rules are mechanical — apply them without thinking.

---

## 1. Files & folders

| Kind | Convention | Example |
|---|---|---|
| Folder | `kebab-case`, singular for a domain, plural for a collection of like things | `article/`, `repositories/`, `components/` |
| Backend layer file | `<domain>.<layer>.ts` | `article.controller.ts`, `article.repository.ts`, `articles.route.ts`, `auth.middleware.ts`, `article.model.ts`, `email.service.ts` |
| Backend test | `<file>.test.ts` next to source | `article.repository.test.ts` |
| Backend integration test | `src/__tests__/integration/<domain>.test.ts` | `ads.test.ts` |
| React component | `kebab-case.tsx` | `article-card.tsx`, `trending-tags-view.tsx` |
| React hook file | `useThing.ts` (camelCase, `use` prefix) | `useCreateArticleForm.ts` |
| Feature barrel | `index.ts` | `features/article/hooks/index.ts` |
| Types | `types.ts` (feature-local) or `src/types/<name>.ts` (shared) | `features/article/types.ts`, `types/common.ts` |
| Storybook story | `<component>.stories.tsx` | `article-card.stories.tsx` |
| Unit test (web/mobile) | `<component>.test.tsx` | `featured-article.test.tsx` |
| Integration test (web/mobile) | `<component>.integration.test.tsx` | `trending-tags-view.integration.test.tsx` |
| E2E spec | `cypress/e2e/<flow>.cy.ts` | `admin-approves-article.cy.ts` |
| SQL migration | `NNN-<verb>-<subject>.sql` | `001-create-articles.sql`, `014-add-articles-slug.sql` |

**Backend uses `<domain>.<layer>.ts`; frontend uses `kebab-case.tsx`.** Do not mix.

> One notable inconsistency to avoid: the backend reference repo has both `controller/` and
> `repositories/` (singular vs plural). **The standard is plural for all layer folders**:
> `controllers/`, `repositories/`, `routes/`, `models/`, `services/`, `middleware/`, `utils/`, `types/`, `config/`.

---

## 2. Identifiers

| Kind | Convention | Example |
|---|---|---|
| Variable, function, method | `camelCase` | `getTrendingTags`, `articleCount` |
| Type, interface, class, enum, React component | `PascalCase` | `Article`, `RequestError`, `ArticleCard` |
| Interface for a contract implemented by a class | `I` prefix | `IArticleRepository` |
| Enum member | `PascalCase` | `Status.Approved` |
| Module-level constant | `SCREAMING_SNAKE_CASE` | `API_BASE_URL`, `MAX_UPLOAD_MB` |
| Constant object / registry | `SCREAMING_SNAKE_CASE` object, `SCREAMING_SNAKE_CASE` keys | `ERRORS.ARTICLE_NOT_FOUND`, `SCHEMA.CREATE_ARTICLE` |
| Zod schema | `<Thing>Schema` | `ArticleSchema` |
| React hook | `use<Thing>` | `useLatestNews` |
| Boolean | `is/has/can/should` prefix | `isLoading`, `hasNext`, `canPublish` |
| Event handler prop | `on<Event>` | `onTagClick` |
| Event handler impl | `handle<Event>` | `handleTagClick` |
| Generic type param | `T`, `TData`, `TError` | `Result<T, E>` |
| Private class field | no underscore; use `private` / `#` | `private readonly pool` |

---

## 3. Function name verbs — use the right one

| Verb | Meaning |
|---|---|
| `get*` | returns a value, may be cached, does not fail on "not found" (returns empty/undefined) |
| `find*` | looks up by criteria; failing to find is an expected `err(...)` |
| `fetch*` | crosses the network (frontend service layer) |
| `create*` / `update*` / `delete*` | mutations |
| `list*` | returns a collection, usually paginated |
| `is*` / `has*` | returns boolean |
| `to*` / `map*` | pure transformation |
| `assert*` | throws / returns err if invariant violated |
| `with*` | HOC or wrapper factory (`withPagination`) |

Backend repositories use `findById`, `create`, `update`, `delete`, `getApprovedArticles`.
Frontend services use `fetchArticleById`, `createArticle`, `updateArticleStatus`.

---

## 4. Database naming (Postgres)

| Kind | Convention | Example |
|---|---|---|
| Table | `snake_case`, **plural** | `articles`, `web_stories`, `article_tags` |
| Column | `snake_case` | `author_id`, `profile_photo_url`, `created_at` |
| PK | `id`, `INT AUTO_INCREMENT` | |
| FK | `<singular_table>_id` | `author_id`, `article_id` |
| Join table | `<a>_<b>` alphabetical, composite PK | `article_tags (article_id, tag_id)` |
| Index | `idx_<column>` or `idx_<a>_<b>` | `idx_status`, `idx_publish_date` |
| Fulltext index | `idx_search` | |
| Unique | `uq_<column>` | `uq_email` |
| Boolean column | `is_<adjective>` | `is_active` |
| Timestamps | `created_at`, `updated_at`, both `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | |
| Enum column | A named Postgres type matching the TS enum values exactly | `CREATE TYPE status AS ENUM ('draft','pending','approved','rejected')` |

**API payloads keep `snake_case` for fields that come straight from the DB** (`author_id`,
`publish_date`, `created_at`). Do not camelCase-convert in the repository — it creates a
mapping layer nobody maintains. Newly designed fields that are *not* DB columns may be
camelCase (`authorId` in a create request body). Be consistent within a single endpoint and
document it in the API contract.

---

## 5. HTTP route naming

```
/api/<plural-resource>[/<sub-resource>][/:id][/<action>]
```

| Rule | Example |
|---|---|
| Plural, kebab-case resource | `/api/articles`, `/api/web-stories` |
| Nested filters as path segments | `/api/articles/approved/category/:category` |
| Pagination & search as query params | `?cursor=100&limit=10&search=foo` |
| Actions as a trailing verb segment on a specific resource | `PATCH /api/articles/:id/status` |
| No verbs in resource names | ❌ `/api/getArticles` |

> The reference backend mounts `/api/web_stories` with an underscore. **Use kebab-case:
> `/api/web-stories`.**

---

## 6. Environment variables

`SCREAMING_SNAKE_CASE`, grouped by prefix:

```
NODE_ENV, PORT, SERVER_URL, CORS_ORIGIN
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL
STORAGE_CONNECTION_STRING, STORAGE_CONTAINER_NAME
```

Frontend public vars: `NEXT_PUBLIC_*` (web), `EXPO_PUBLIC_*` (mobile). Anything without that
prefix must never reach the client bundle.

---

## 7. Git branch & commit naming

**Branch:** `<author>/<type>/<short-slug>` — e.g. `prapande/feat/article-scheduling`

Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `ci`.

**Commit:** Conventional Commits, imperative mood, ≤ 72-char subject.

```
feat(article): add scheduled publishing

Adds publish_date scheduling with a cron sweep that flips
status pending -> approved at the scheduled time.

Refs: #142
```

Scope = the domain (`article`, `auth`, `web-story`) or the layer (`api`, `web`, `mobile`, `db`).

---

## 8. Comments

Write a comment only for what the code cannot show:

- **Why**, not what. `// FULLTEXT index requires MATCH...AGAINST; LIKE would not use the index`
- Non-obvious constraints. `// Cloudinary rejects files > 10MB even though our limit is 5MB`
- Links to a ticket for workarounds.

Banned: commented-out code, `// TODO` without a ticket ID, section-divider ASCII art
(`// *** GET ***`) — use file organisation instead, changelog comments (git has them),
and JSDoc that restates the signature.

Do use JSDoc for exported utilities whose behaviour is non-obvious, and always for the
`ERRORS` registry entries' semantics.
