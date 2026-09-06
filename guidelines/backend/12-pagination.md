# Backend — 12 Pagination

**Every list endpoint is cursor-paginated. Offset pagination is banned.** No exceptions
without a logged decision.

This file is the authoritative reference for backend pagination. `04-api-design.md` and
`05-database.md` point here.

---

## 1. Why cursor and not offset

`LIMIT ? OFFSET ?` looks simpler and is wrong for our workloads in three separate ways.

### 1.1 It drifts under concurrent writes

```
t0  page 1 = OFFSET 0  LIMIT 10   → rows 1..10
t1  a new article is inserted at the top
t2  page 2 = OFFSET 10 LIMIT 10   → the old row 10 is now row 11
```

The user sees row 10 **twice** and never sees one row at all. On a feed that is written to
constantly — which is every feed we build — this happens on ordinary traffic, not just under
load. Deletes cause the mirror-image bug: rows silently skipped.

A cursor is anchored to a **row**, not to a position, so inserts and deletes above the cursor
cannot shift the window.

### 1.2 It scans linearly

`OFFSET 100000` makes Postgres read and discard 100,000 rows before returning 10. Page 1 is fast,
page 5,000 times out. Cursor pagination is an index seek: page 5,000 costs exactly what page 1
costs.

### 1.3 It needs a count

Offset UIs want "page 7 of 213", which means `COUNT(*)` on every request — a full index scan
that gets slower as the table grows, for a number nobody acts on.

### When offset is genuinely acceptable

Only for a **bounded, static** set — an admin dropdown over a table that will never exceed a
few hundred rows, or an export job over a snapshot. Write it in the module doc and justify it.
If the set can grow, use a cursor.

---

## 2. The contract

### Request

```
GET /api/articles/approved/latest?cursor=<number>&limit=<number>
```

| Param | Type | Rule |
|---|---|---|
| `cursor` | number | The last seen primary key. **Exclusive.** First page: `Number.MAX_SAFE_INTEGER` |
| `limit` | number | 1–100, default 10 |

The client never constructs a cursor itself beyond the first-page sentinel — it echoes back the
`nextCursor` the server gave it.

### Response

```jsonc
{
  "success": true,
  "message": "Articles fetched successfully",
  "data": [ /* T[] */ ],
  "pagination": { "hasNext": true, "nextCursor": 128 },
  "timestamp": "2026-09-02T10:00:00.000Z"
}
```

| Field | Meaning |
|---|---|
| `hasNext` | Is there at least one more row after this page? |
| `nextCursor` | The `id` of the **last row returned**. Feed it back as `cursor` for the next page. |

When `hasNext` is `false`, `nextCursor` is still the last returned id, or `0` for an empty page.
The client stops on `hasNext === false` — it never inspects `nextCursor` to decide.

---

## 3. Route layer

```ts
const SCHEMA = {
  LIST_QUERY: z.object({
    cursor: z.coerce.number().int().positive().default(Number.MAX_SAFE_INTEGER),
    limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  }),
} as const;

articleRouter.get(
  '/approved/latest',
  cacheMiddleware(CACHE_TTL.LATEST_FEED),
  validateRequest({ query: SCHEMA.LIST_QUERY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { cursor, limit } = req.validated.query;
    const result = await articleController.listLatestApproved(cursor, limit);
    result.match(
      (data) => res.json(successResponse(data, 'Articles fetched successfully')),
      (error) => next(error),
    );
  },
);
```

Rules:

| # | Rule |
|---|---|
| PR1 | `z.coerce` — query params are strings. |
| PR2 | `.max(PAGINATION.MAX_LIMIT)` on **every** list endpoint. An unbounded `limit` is a DoS vector and a way to exfiltrate a whole table in one request. |
| PR3 | Defaults live in the schema (`.default(...)`), never as `?? 10` in the handler. |
| PR4 | Limits come from `config/constants.ts`, never inline numbers. |
| PR5 | The handler consumes `req.validated.query` — it never re-parses. |

```ts
// config/constants.ts
export const PAGINATION = { DEFAULT_LIMIT: 10, MAX_LIMIT: 100 } as const;
```

---

## 4. Repository layer — the canonical implementation

The repository returns `Paginated<T>`. Computing `hasNext` is a **data-access** concern, not a
controller concern, because it depends on the `limit + 1` trick.

```ts
// types/pagination.ts
export interface Paginated<T> {
  data: T[];
  pagination: { hasNext: boolean; nextCursor: number };
}
```

```ts
// repositories/article.repository.ts
async listApproved(cursor: number, limit: number): Promise<Result<Paginated<Article>, RequestError>> {
  try {
    const [rows] = await db.query<Article[]>(
      `SELECT id, author_id, title, category, region, image, status, publish_date, created_at
         FROM ${ARTICLES_TABLE}
        WHERE status = ?
          AND id < ?
        ORDER BY id DESC
        LIMIT ?`,
      [Status.Approved, cursor, limit + 1],        // fetch one extra to detect the next page
    );

    return ok(toPage(rows, limit));
  } catch (error) {
    logger.error('listApproved failed', { cursor, limit, error });
    return err(ERRORS.DATABASE_ERROR);
  }
}
```

```ts
// utils/pagination.ts — one helper, used by every list method
export function toPage<T extends { id: number }>(rows: T[], limit: number): Paginated<T> {
  const hasNext = rows.length > limit;
  const data = hasNext ? rows.slice(0, limit) : rows;
  return { data, pagination: { hasNext, nextCursor: data.at(-1)?.id ?? 0 } };
}
```

`toPage` exists so that `hasNext` is computed identically everywhere. Every list method ends
with `return ok(toPage(rows, limit));`.

### The `limit + 1` trick

Ask for one more row than you need. If you get it, there is a next page — and you throw that
row away. One query, no count, exact answer.

```
limit = 10, rows returned = 11  →  hasNext = true,  data = rows[0..9]
limit = 10, rows returned = 10  →  hasNext = false, data = rows[0..9]
limit = 10, rows returned = 3   →  hasNext = false, data = rows[0..2]
limit = 10, rows returned = 0   →  hasNext = false, data = [], nextCursor = 0
```

### Non-negotiables

| # | Rule |
|---|---|
| PG1 | `WHERE <filters> AND id < ?` — the cursor is a `WHERE` predicate, never `OFFSET`. |
| PG2 | `ORDER BY id DESC` and the cursor comparison must agree: `DESC` pairs with `<`, `ASC` pairs with `>`. Mismatch silently returns the wrong page. |
| PG3 | Fetch `limit + 1`; derive `hasNext` with `toPage`. |
| PG4 | **Never** `COUNT(*)` to compute `hasNext` or a total. |
| PG5 | **Never** `OFFSET`. |
| PG6 | `LIMIT ?` is a bound parameter, never interpolated. |
| PG7 | Explicit column list — a feed must not ship `LONGTEXT content`. |
| PG8 | The composite index must cover the filter **and** the cursor order (§6). |

---

## 5. Controller layer

The controller passes `cursor` and `limit` through and returns the `Paginated<T>` unchanged.

```ts
export async function listLatestApproved(
  cursor: number,
  limit: number,
): Promise<Result<Paginated<Article>, RequestError>> {
  return ArticleRepository.listApproved(cursor, limit);
}
```

A controller never slices, re-sorts, or filters a page in memory. Filtering after pagination
returns short pages and breaks `hasNext` — push the predicate into the SQL.

---

## 6. Indexing

This is what makes cursor pagination fast, and it is the step people skip.

```sql
-- WHERE status = ? AND id < ? ORDER BY id DESC
INDEX idx_status_id (status, id)
```

The index must contain **the equality-filtered columns first, then the cursor/order column**.
With `(status, id)` Postgres seeks straight to the cursor position inside the `status` group and
walks backwards. With a single-column `idx_status`, it matches every approved row and then
sorts them — `Using filesort` on every page load.

| Query shape | Index |
|---|---|
| `WHERE status = ? AND id < ?` | `(status, id)` |
| `WHERE category = ? AND status = ? AND id < ?` | `(status, category, id)` |
| `WHERE author_id = ? AND id < ?` | `(author_id, id)` |
| `WHERE id < ?` (unfiltered) | the primary key is enough |

Verify with `EXPLAIN`. Requirements: `type` is `range`, `Extra` shows `Using where` and
**not** `Using filesort` or `Using temporary`, and `rows` examined is close to `limit`.
Paste the output in the PR for any new list query.

---

## 7. Sorting by something other than `id`

An `id` cursor only works when `id` is the sort key. To sort by `publish_date`, the cursor
must be a **composite** — the sort column plus `id` as a tiebreaker — or rows sharing a
timestamp will be skipped or repeated.

```sql
SELECT id, title, publish_date
  FROM articles
 WHERE status = 'approved'
   AND (publish_date < ? OR (publish_date = ? AND id < ?))
 ORDER BY publish_date DESC, id DESC
 LIMIT ?
```

Index: `(status, publish_date, id)`.

The cursor is then an opaque token, not a bare number:

```ts
// utils/pagination.ts
export function encodeCursor(publishDate: string, id: number): string {
  return Buffer.from(`${publishDate}|${id}`).toString('base64url');
}

export function decodeCursor(raw: string): Result<{ publishDate: string; id: number }, RequestError> {
  const parsed = CursorSchema.safeParse(
    Buffer.from(raw, 'base64url').toString('utf8').split('|'),
  );
  if (!parsed.success) return err(ERRORS.INVALID_QUERY_PARAMETER);
  return ok({ publishDate: parsed.data[0], id: parsed.data[1] });
}
```

Rules for composite cursors:

- The cursor is **opaque to the client**. It is base64url, it is never parsed client-side, and
  its internal format may change without an API version bump.
- Always Zod-validate after decoding — a cursor arrives from the network and is untrusted.
- A malformed cursor returns `INVALID_QUERY_PARAMETER` (400). It never falls back to page one
  silently, and it never reaches SQL.
- **Always** include `id` as the final tiebreaker, in both the `WHERE` and the `ORDER BY`.

Default to an `id` cursor. Only reach for a composite cursor when the product genuinely
requires a different sort order.

---

## 8. Pagination with search

`FULLTEXT` search still paginates by cursor:

```sql
SELECT id, title
  FROM articles
 WHERE status = 'approved'
   AND MATCH(title, content) AGAINST (? IN NATURAL LANGUAGE MODE)
   AND id < ?
 ORDER BY id DESC
 LIMIT ?
```

If the product needs **relevance ordering**, relevance is not stable across pages as the index
changes, and it isn't a column you can put a cursor on. Options, in order of preference:

1. Cap results (e.g. top 100) and don't paginate — most search UIs never need page 6.
2. Order by `id` within a relevance-filtered set and accept approximate ranking.
3. Move to a search service with native cursor support. That is a logged decision.

Never fall back to `OFFSET` for search.

---

## 9. Client contract

The frontend and mobile apps consume this with `useInfiniteQuery`:

```ts
useInfiniteQuery({
  queryKey: articleKeys.latest(),
  queryFn: ({ pageParam }) => fetchLatestArticles(pageParam, PAGE_SIZE.FEED),
  initialPageParam: Number.MAX_SAFE_INTEGER,
  getNextPageParam: (last) => (last.pagination.hasNext ? last.pagination.nextCursor : undefined),
});
```

Consequences the backend must honour:

- `nextCursor` must be usable **verbatim** as the next `cursor`. Never return a cursor the
  client has to transform.
- Returning `hasNext: true` with an empty `data` array causes an infinite fetch loop on the
  client. `toPage` makes that impossible; hand-rolled variants do not.
- Page size is the client's choice within `MAX_LIMIT`; the server never silently changes it.

Because cursor pagination has no page numbers, a UI cannot offer "jump to page 7". That is a
deliberate trade — state it in the module doc so design doesn't assume otherwise.

---

## 10. Testing

Unit (repository, mocked `db`):

```ts
it('requests limit + 1 rows and reports hasNext when the extra row is present', async () => {
  mockQuery.mockResolvedValueOnce([makeArticleRows(11)]);

  const result = await ArticleRepository.listApproved(999, 10);

  expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('id < ?'), [Status.Approved, 999, 11]);
  expect(result._unsafeUnwrap().data).toHaveLength(10);
  expect(result._unsafeUnwrap().pagination.hasNext).toBe(true);
});

it('reports hasNext false and nextCursor 0 for an empty page', async () => {
  mockQuery.mockResolvedValueOnce([[]]);

  const page = (await ArticleRepository.listApproved(999, 10))._unsafeUnwrap();

  expect(page.data).toEqual([]);
  expect(page.pagination).toEqual({ hasNext: false, nextCursor: 0 });
});

it('never interpolates the cursor into the SQL string', async () => {
  mockQuery.mockResolvedValueOnce([[]]);
  await ArticleRepository.listApproved(999, 10);
  expect(mockQuery.mock.calls[0][0]).not.toContain('999');
});
```

Integration (real Postgres, seeded with 25 rows) — this is the level that proves the SQL is right:

- [ ] First page returns `limit` rows, `hasNext: true`
- [ ] Walking with `nextCursor` reaches the last page with `hasNext: false`
- [ ] Concatenating all pages yields every row **exactly once, in order** — the anti-drift test
- [ ] An empty result returns `{ data: [], hasNext: false, nextCursor: 0 }`
- [ ] `limit` above `MAX_LIMIT` is rejected with 400
- [ ] `limit=0`, `limit=-1`, `cursor=abc` are each rejected with 400
- [ ] Inserting a new top row mid-walk does **not** duplicate or skip a row on later pages
- [ ] `EXPLAIN` on the seeded table shows no `Using filesort`

Route level:

- [ ] The response contains a `pagination` object with both fields
- [ ] Omitted `cursor`/`limit` fall back to the schema defaults

---

## 11. Anti-patterns (blocking review comments)

| Anti-pattern | Why | Instead |
|---|---|---|
| `LIMIT ? OFFSET ?` | drifts, scans linearly | `WHERE id < ?` |
| `COUNT(*)` for `hasNext` or a total | full scan on every request | `limit + 1` |
| `hasNext: rows.length === limit` | wrong on an exactly-full last page | `limit + 1` + `toPage` |
| Returning `hasNext: true` with empty `data` | infinite loop on the client | `toPage` |
| No `.max()` on `limit` | DoS / bulk exfiltration | `.max(PAGINATION.MAX_LIMIT)` |
| Inline `limit` defaults in the handler | drifts from the schema | `.default()` in `SCHEMA` |
| `ORDER BY publish_date DESC` with an `id` cursor | skips or repeats rows on ties | composite cursor + `id` tiebreaker |
| `ORDER BY ... ASC` with `id < ?` | returns the wrong page, silently | pair `ASC` with `>` |
| `ORDER BY` without an `id` tiebreaker | unstable across pages | always end with `id` |
| Filtering or slicing a page in the controller | short pages, wrong `hasNext` | push it into the SQL |
| `SELECT *` on a list endpoint | ships `LONGTEXT` over the wire | explicit columns |
| Single-column index on the filter | `Using filesort` every page | composite `(filter…, id)` |
| Client-parsed composite cursor | can't change the format | opaque base64url |
| Unvalidated cursor reaching SQL | untrusted input | Zod-validate on decode |

---

## 12. Checklist

- [ ] `cursor` and `limit` validated with `z.coerce`, defaults in the schema, `limit` capped at `MAX_LIMIT`
- [ ] Constants from `config/constants.ts`
- [ ] Repository returns `Paginated<T>` and ends with `toPage(rows, limit)`
- [ ] Query uses `WHERE … AND id < ?`, `ORDER BY id DESC`, `LIMIT ?` with `limit + 1`
- [ ] Order direction and cursor comparison agree
- [ ] `ORDER BY` ends with `id` as a tiebreaker
- [ ] Composite index covers the filter **and** the cursor order; `EXPLAIN` shows no filesort
- [ ] Explicit column list; no `SELECT *`
- [ ] No `OFFSET`, no `COUNT(*)`
- [ ] Composite cursors are opaque, base64url, and Zod-validated on decode
- [ ] `nextCursor` is usable verbatim by the client
- [ ] Tests cover first page, middle page, last page, empty, over-limit, malformed cursor, and the no-duplicates walk
