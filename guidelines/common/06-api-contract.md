# 06 — API Contract

The API contract is the seam between backend, web, and mobile. It is agreed **once**, recorded
in the owning module's doc (`project/modules/<part>.md` §5), before either side writes code.
Both sides then implement to it independently.

---

## 1. Envelope

Every response — success or failure — uses one of exactly two shapes.

### Success

```jsonc
{
  "success": true,
  "message": "Articles fetched successfully",
  "data": { /* T */ },
  "timestamp": "2026-09-02T10:00:00.000Z"
}
```

### Success, paginated

```jsonc
{
  "success": true,
  "message": "Articles fetched successfully",
  "data": [ /* T[] */ ],
  "pagination": { "hasNext": true, "nextCursor": 42 },
  "timestamp": "2026-09-02T10:00:00.000Z"
}
```

### Error

```jsonc
{
  "success": false,
  "error": { "code": 50001, "message": "Article not found" },
  "requestId": "01J8Z9M2K7Q3XV",
  "timestamp": "2026-09-02T10:00:00.000Z"
}
```

**Rules:**

- `data` is never `null` on success. Empty collection → `[]`. Absent single resource → 404.
- `message` is for humans/logs. Clients branch on `error.code`, never on `message`.
- `pagination` is present **iff** the endpoint is paginated.
- The envelope is produced only by `successResponse()` / `errorResponse()` in
  `src/utils/response.ts`. No handler writes a literal object.

### Shared envelope schemas

Both sides parse the envelope with Zod. Keep these in `src/types/api.ts` on each side (or a
shared package when one exists).

```ts
export const PaginationSchema = z.object({
  hasNext: z.boolean(),
  nextCursor: z.number(),
});

export const successEnvelope = <T extends ZodTypeAny>(data: T) =>
  z.object({ success: z.literal(true), message: z.string(), data, timestamp: z.string() });

export const paginatedEnvelope = <T extends ZodTypeAny>(item: T) =>
  successEnvelope(z.array(item)).extend({ pagination: PaginationSchema });

export const ErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({ code: z.number(), message: z.string() }),
  requestId: z.string().optional(),
  timestamp: z.string(),
});
```

---

## 2. Resource URLs

```
/api/<plural-kebab-resource>[/<qualifier>...][/:id][/<action>]
```

| Pattern | Example |
|---|---|
| Collection | `GET /api/articles` |
| Single | `GET /api/articles/:id` |
| Filtered collection | `GET /api/articles/approved/category/:category` |
| Sub-resource | `GET /api/articles/:id/tags` |
| Action on a resource | `PATCH /api/articles/:id/status` |
| Search | `GET /api/articles/search?search=...` |

No verbs in resource segments. No `snake_case` in URLs (`/api/web-stories`, not `/api/web_stories`).

---

## 3. HTTP methods & status codes

| Method | Semantics | Success status |
|---|---|---|
| `GET` | Safe, idempotent, cacheable. No side effects, ever. | 200 |
| `POST` | Create, or a non-idempotent action. | 201 (create) / 200 (action) |
| `PUT` | Full replace. Idempotent. | 200 |
| `PATCH` | Partial update. | 200 |
| `DELETE` | Remove. Idempotent — deleting twice returns 200/204, not 404. | 200 (returns the deleted entity) / 204 |

Errors: see the mapping table in [04-error-model.md](04-error-model.md#3-the-errors-registry).

---

## 4. Pagination

**Cursor-based, always.** Offset pagination is banned (it drifts under concurrent writes and
scans badly at depth).

> Backend implementation, indexing, composite cursors, and tests:
> [backend/12-pagination.md](../backend/12-pagination.md).

### Request

```
?cursor=<number>&limit=<number>
```

- `cursor` is the last seen **primary key**, exclusive, descending order.
- First page: client sends `cursor = Number.MAX_SAFE_INTEGER`.
- `limit` default 10, max 100. Both validated with `z.coerce.number().min(1)`.

### SQL

```sql
SELECT ... FROM articles
WHERE status = 'approved' AND id < ?
ORDER BY id DESC
LIMIT ?
```

Fetch `limit + 1` rows; if you get `limit + 1`, `hasNext = true` and you return the first
`limit`. `nextCursor` is the `id` of the last returned row.

### Response

```jsonc
"pagination": { "hasNext": true, "nextCursor": 128 }
```

When `hasNext` is `false`, `nextCursor` is the last id (or `0` for an empty page).

> A non-negotiable: **never** compute `hasNext` with a second `COUNT(*)` query.

---

## 5. Filtering, sorting, searching

| Concern | Convention |
|---|---|
| Filter by a small closed set | path segment: `/approved/region/:region` |
| Filter by an open value | query param: `?authorId=12` |
| Full-text search | `?search=<term>` against a `FULLTEXT` index, `MATCH ... AGAINST` |
| Sort | `?sort=<field>&order=asc\|desc`, whitelist fields server-side |
| Multi-value | repeated param `?tag=a&tag=b`, parsed with `z.array(z.string())` |

Never interpolate a sort field into SQL. Map it through a whitelist object.

---

## 6. Request validation

Every route declares its schemas in a `SCHEMA` const at the top of the router file and passes
them to `validateRequest`.

```ts
const SCHEMA = {
  LIST_QUERY: z.object({
    cursor: z.coerce.number().min(1).default(Number.MAX_SAFE_INTEGER),
    limit:  z.coerce.number().min(1).max(100).default(10),
  }),
  ID_PARAM: z.object({ id: z.coerce.number().int().positive() }),
  CREATE_BODY: z.object({
    title:    z.string().min(1).max(255),
    content:  z.string().min(1),
    category: z.enum(Category),
    region:   z.enum(Region),
    image:    z.url(),
    tags:     z.array(z.string().min(1)).max(20),
    status:   z.enum(Status).default(Status.Draft),
  }),
} as const;
```

`validateRequest` must:

1. Validate `params`, `query`, and `body`.
2. **Assign the parsed result back** onto the request (`req.validated = {...}`), so the
   handler does not parse a second time.
3. `return next(ERRORS.X)` on the *first* failure — with an explicit `return`.

> Two bugs in the reference implementation to avoid: it calls `next(err)` **without
> returning**, so `next()` is called twice; and it discards the parsed output, forcing every
> handler to `.parse()` again (and the reference article router even parses with a *different*
> schema than it validated with). Fix both.

Correct shape:

```ts
export const validateRequest =
  (schemas: RequestValidation): RequestHandler =>
  (req, _res, next) => {
    if (schemas.params) {
      const r = schemas.params.safeParse(req.params);
      if (!r.success) { logger.warn('param validation failed', { requestId: req.id, issues: r.error.issues }); return next(ERRORS.INVALID_PARAMS); }
      req.validated = { ...req.validated, params: r.data };
    }
    if (schemas.query) {
      const r = schemas.query.safeParse(req.query);
      if (!r.success) { logger.warn('query validation failed', { requestId: req.id, issues: r.error.issues }); return next(ERRORS.INVALID_QUERY_PARAMETER); }
      req.validated = { ...req.validated, query: r.data };
    }
    if (schemas.body) {
      const r = schemas.body.safeParse(req.body);
      if (!r.success) { logger.warn('body validation failed', { requestId: req.id, issues: r.error.issues }); return next(ERRORS.INVALID_REQUEST_BODY); }
      req.validated = { ...req.validated, body: r.data };
    }
    return next();
  };
```

Validation failures log the Zod issues (server-side) but **never** return them to the client —
they describe internal field names. Return the generic registry error.

---

## 7. Authentication

- Bearer JWT in `Authorization: Bearer <token>`. Access token TTL is 6 hours; that is also the
  revocation lag — see [backend/09-security.md](../backend/09-security.md) §2.1.
- Refresh token: `POST /api/auth/refresh`, httpOnly + secure + sameSite cookie, ≤ 30 days.
- Token payload is minimal and validated with Zod on decode:
  `{ sub, role, iat, exp }`. Never put mutable profile data in a JWT.
- `authenticate` middleware sets `req.user`. `requireRole(Role.Admin)` gates authorisation.
- **Authorisation is checked server-side on every request**, including ownership checks
  ("is this author the owner of this article?"). Hiding a button is not authorisation.

---

## 8. Idempotency & concurrency

- `POST` endpoints that create money-affecting or externally-visible resources accept an
  `Idempotency-Key` header and de-duplicate for 24h.
- Updates that can race use optimistic concurrency: client sends `updated_at`, server
  rejects with `409` if it no longer matches.

---

## 9. Versioning & breaking changes

- Path-versioned only when we break: `/api/v2/articles`. Default is unversioned `/api/`.
- **Additive changes are safe** (new optional field, new endpoint). Clients must ignore
  unknown fields — so client Zod schemas must **not** use `.strict()`.
- Breaking changes require: a decision logged in the module doc, a deprecation window
  with `Deprecation` + `Sunset` headers, and a mobile-app minimum-version check (mobile clients
  cannot be force-upgraded).

---

## 10. Documenting a contract

Every endpoint gets a block in its module doc, `project/modules/<part>.md` §5:

```markdown
### GET /api/articles/approved/tag/:tag

| | |
|---|---|
| Auth | none |
| Rate limit | default |
| Cache | 30 min, `cacheMiddleware(CACHE_TTL.TAG_FEED)` |

**Path params** — `tag: string` (1..100)
**Query** — `cursor: number (default MAX_SAFE_INTEGER)`, `limit: number (1..100, default 10)`
**Response 200** — `paginatedEnvelope(ArticleSchema)`
**Errors** — `10003` invalid query, `10001` database error
```

---

## 11. Checklist

- [ ] URL is plural, kebab-case, verb-free.
- [ ] Method matches semantics; `GET` has no side effects.
- [ ] Response uses `successResponse` / `errorResponse` only.
- [ ] Pagination is cursor-based with `hasNext` / `nextCursor`.
- [ ] `params`, `query`, `body` all validated; parsed values reused, not re-parsed.
- [ ] Every error path maps to a registry code documented in the contract.
- [ ] Auth and ownership enforced server-side.
- [ ] Client Zod schema is non-strict (tolerates new fields).
- [ ] Contract block recorded in the module doc **before** implementation.
