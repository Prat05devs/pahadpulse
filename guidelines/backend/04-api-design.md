# Backend — 04 API Design

Backend-side implementation of the contract in
[common/06-api-contract.md](../common/06-api-contract.md). Read that first; this file covers
the server-specific mechanics.

---

## 1. Endpoint inventory pattern

A domain exposes a predictable set. Deviate only when the module genuinely requires it.

| Use case | Method + path | Auth |
|---|---|---|
| Public list | `GET /api/articles/approved/latest` | none |
| Public filtered list | `GET /api/articles/approved/category/:category` | none |
| Public search | `GET /api/articles/search?search=` | none |
| Public detail | `GET /api/articles/approved/:id` | none |
| Owner list | `GET /api/articles/mine` | author |
| Moderation list | `GET /api/articles/pending` | admin |
| Detail (any status) | `GET /api/articles/:id` | owner or admin |
| Create | `POST /api/articles` | author |
| Update | `PUT /api/articles/:id` | owner or admin |
| Partial update | `PATCH /api/articles/:id` | owner or admin |
| State transition | `PATCH /api/articles/:id/status` | admin (or author for draft→pending) |
| Delete | `DELETE /api/articles/:id` | owner or admin |
| Sub-resource | `GET /api/articles/:id/tags` | matches parent |

Note `GET /api/articles/mine` rather than `GET /api/articles/author/:authorId` — the actor
comes from the token, so there is no ID to tamper with.

---

## 2. Route registration order

Express matches in registration order. Static segments must be registered before
parameterised ones.

```ts
articleRouter.get('/approved/latest', ...);      // ✅ first
articleRouter.get('/approved/top', ...);
articleRouter.get('/approved/category/:category', ...);
articleRouter.get('/approved/:id', ...);          // ✅ after the static ones
articleRouter.get('/search', ...);
articleRouter.get('/pending', ...);
articleRouter.get('/:id', ...);                   // ✅ last
```

Group the file in this order, with no ASCII banners — the ordering *is* the grouping:
public reads → authenticated reads → writes → state transitions → deletes.

---

## 3. Request validation

```ts
const SCHEMA = {
  ID_PARAM: z.object({ id: z.coerce.number().int().positive() }),
  SLUG_PARAM: z.object({ category: z.enum(Category) }),
  LIST_QUERY: z.object({
    cursor: z.coerce.number().int().positive().default(Number.MAX_SAFE_INTEGER),
    limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  }),
  SEARCH_QUERY: z.object({
    search: z.string().trim().min(2).max(100),
  }).and(LIST_QUERY_SHAPE),
  UPDATE_STATUS_BODY: z
    .object({ status: z.enum(Status), rejection_reason: z.string().min(1).max(1000).optional() })
    .refine((v) => v.status !== Status.Rejected || v.rejection_reason !== undefined, {
      message: 'rejection_reason is required when rejecting',
    }),
} as const;
```

Rules:

1. **Validate `params` too.** A `:category` that isn't a real category should 400, not reach SQL.
2. Use `z.coerce` for anything from the URL — query and params are always strings.
3. Enforce `max` on every string and array. Unbounded input is a DoS vector.
4. Express conditional requirements with `.refine()` in the schema, not with an `if` in the controller.
5. `.default()` in the schema, not `?? 10` in the handler.
6. Never `.strict()` on request bodies — clients may send extra fields; ignore them.
7. Do **not** return Zod issues to the client; log them, return the registry code.

---

## 4. Pagination implementation

**Cursor-based, always. `OFFSET` is banned.** Full rules, rationale, indexing, composite
cursors, and tests: **[12-pagination.md](12-pagination.md)**.

The short version — the repository returns `Paginated<T>` and derives `hasNext` by fetching one
extra row:

```ts
// repositories/article.repository.ts
async listApproved(cursor: number, limit: number): Promise<Result<Paginated<Article>, RequestError>> {
  try {
    const [rows] = await db.query<Article[]>(
      `SELECT id, author_id, title, category, region, image, status, publish_date, created_at
         FROM ${ARTICLES_TABLE}
        WHERE status = ? AND id < ?
        ORDER BY id DESC
        LIMIT ?`,
      [Status.Approved, cursor, limit + 1],       // fetch one extra
    );

    return ok(toPage(rows, limit));               // utils/pagination.ts
  } catch (error) {
    logger.error('listApproved failed', { cursor, limit, error });
    return err(ERRORS.DATABASE_ERROR);
  }
}
```

`successResponse` detects the `Paginated<T>` shape and flattens it into the envelope.

**Never** issue a `COUNT(*)` to compute `hasNext`. **Never** use `OFFSET`. The composite index
must cover the filter **and** the cursor order — see [12-pagination.md](12-pagination.md) §6.

---

## 5. Filtering, sorting, search

```ts
const SORTABLE = { created_at: 'created_at', publish_date: 'publish_date', title: 'title' } as const;

const column = SORTABLE[sort];
if (column === undefined) return err(ERRORS.INVALID_QUERY_PARAMETER);
const direction = order === 'asc' ? 'ASC' : 'DESC';
// safe: both come from literal unions
const sql = `... ORDER BY ${column} ${direction}, id DESC LIMIT ?`;
```

Full-text search uses the `FULLTEXT` index:

```sql
SELECT id, title, ...
  FROM articles
 WHERE status = 'approved'
   AND MATCH(title, content) AGAINST (? IN NATURAL LANGUAGE MODE)
   AND id < ?
 ORDER BY id DESC
 LIMIT ?
```

Always add a secondary `ORDER BY id DESC` tiebreaker so cursor pagination stays stable.

---

## 6. State transitions

Model them explicitly; never let a client set an arbitrary status.

```ts
// controllers/article.controller.ts
const ALLOWED_TRANSITIONS: Readonly<Record<Status, readonly Status[]>> = {
  [Status.Draft]:    [Status.Pending],
  [Status.Pending]:  [Status.Approved, Status.Rejected],
  [Status.Rejected]: [Status.Draft, Status.Pending],
  [Status.Approved]: [],
};

function canTransition(from: Status, to: Status): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
```

Then: role check (only admin may approve/reject), transition check, then persist. Every
rejected transition returns `ARTICLE_STATUS_TRANSITION_NOT_ALLOWED`, not a generic 400.

Document the state machine as a Mermaid diagram in the module's doc (§3).

---

## 7. File uploads

```ts
// middleware/upload.middleware.ts
export const uploadSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD.MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    cb(null, UPLOAD.ALLOWED_MIME.includes(file.mimetype));
  },
}).single('image');
```

Then, in the controller:

1. Verify **magic bytes** (`file-type`), not just the declared MIME.
2. Generate a random filename; never use `file.originalname`.
3. Upload to object storage; store only the resulting URL in Postgres.
4. Strip EXIF from user-supplied images.
5. Return `{ url }`.

Body-size limits: `express.json({ limit: '1mb' })` globally; the multer limit applies only on
upload routes. Never raise the global limit for one endpoint.

---

## 8. Caching

```ts
export function cacheMiddleware(ttlSeconds: number): RequestHandler {
  return (req, res, next) => {
    // Never cache anything that depends on identity.
    if (req.method !== 'GET' || req.headers.authorization !== undefined || req.headers.cookie !== undefined) {
      return next();
    }

    const key = req.originalUrl;
    const hit = cache.get(key);
    if (hit !== undefined) {
      res.setHeader('x-cache', 'HIT');
      return res.json(hit);
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) cache.set(key, body, ttlSeconds);
      return originalJson(body);
    };
    return next();
  };
}
```

The two guards — **no identity headers**, **2xx only** — are the difference between a cache and
a data-leak. Both are missing from the reference implementation.

Invalidate on write:

```ts
export function invalidateArticleFeeds(): void {
  cache.keys().filter((k) => k.startsWith('/api/articles/approved')).forEach((k) => cache.del(k));
}
```

Also send HTTP cache headers on public GETs: `Cache-Control: public, max-age=60, stale-while-revalidate=300`.

---

## 9. Rate limiting

```ts
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(ERRORS.RATE_LIMITED),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email ?? '')}`,
  handler: (_req, _res, next) => next(ERRORS.RATE_LIMITED),
});
```

`app.set('trust proxy', 1)` is required behind a load balancer, or every request appears to
come from the proxy's IP.

---

## 10. Response headers

| Header | On |
|---|---|
| `x-request-id` | every response |
| `Cache-Control` | public GETs (`public, max-age=…`), everything else `no-store` |
| `ETag` | public GETs with stable bodies |
| `Retry-After` | 429 and 503 |
| `Deprecation` / `Sunset` | endpoints being retired |

`helmet()` supplies `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, HSTS.

---

## 11. Checklist

- [ ] Path is plural, kebab-case, verb-free; static routes registered before `:params`.
- [ ] `params`, `query`, and `body` all have schemas; strings and arrays have `max`.
- [ ] Handler consumes `req.validated`; no second `.parse()`.
- [ ] Actor from `req.actor`, never from the body.
- [ ] Pagination is cursor-based with `limit + 1`; no `COUNT(*)`, no `OFFSET`.
- [ ] Sort/filter identifiers come from a whitelist.
- [ ] State transitions validated against an explicit table.
- [ ] Cache middleware only on public GETs, only caching 2xx; invalidation wired.
- [ ] Rate limiting appropriate for the route.
- [ ] `201` on create; error codes registered and documented in the module doc.
