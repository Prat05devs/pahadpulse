# Backend — 10 Performance & Caching

Optimise in this order: **correct index → fewer queries → less data → cache → scale out.**
Never start at the end.

---

## 1. Budgets

| Metric | Target |
|---|---|
| p50 API latency (cached read) | < 30 ms |
| p50 API latency (DB read) | < 100 ms |
| p95 API latency | < 300 ms |
| p99 API latency | < 800 ms |
| Single DB query | < 50 ms |
| Payload size (list endpoint) | < 100 KB |
| Startup to `/ready` | < 10 s |
| Memory per instance | < 512 MB steady state |

An endpoint that misses its budget gets an entry in its module doc, not a shrug.

---

## 2. Database first

Most backend slowness is one missing composite index.

```sql
-- feed query: WHERE status = ? AND id < ? ORDER BY id DESC
INDEX idx_status_id (status, id)
```

The index must cover **both** the filter and the ordering, in that column order. A
single-column `idx_status` still forces a filesort over every matching row.

Checklist for any new query on a table over ~10k rows:

- [ ] `EXPLAIN` shows `type` ≥ `range`, never `ALL`.
- [ ] No `Using filesort`, no `Using temporary`.
- [ ] `rows` examined is close to `rows` returned.
- [ ] Paste the `EXPLAIN` output in the PR description.

Other rules:

- Explicit column lists — never ship `LONGTEXT content` in a list response.
- No functions on indexed columns (`WHERE DATE(created_at) = ?` → use a range).
- Batch instead of loop (`WHERE id IN (?)`), never N+1.
- `EXISTS` over `COUNT(*) > 0`.
- No `COUNT(*)` for pagination — that is why we use cursors.
- Index selectivity matters: an index on a boolean is usually useless alone; make it composite.

---

## 3. Payload size

| Technique | Effect |
|---|---|
| Explicit `SELECT` columns | biggest single win on feeds |
| Separate "list" and "detail" row types | list omits `content`, `rejection_reason` |
| `compression()` middleware (gzip/brotli) | ~70% on JSON |
| Sensible `limit` cap (100) | prevents accidental full-table pulls |
| Return IDs, let the client fetch detail lazily | for very wide objects |

Define both shapes in the model:

```ts
export interface Article extends RowDataPacket { /* full */ }
export type ArticleListItem = Omit<Article, 'content' | 'rejection_reason'>;
```

---

## 4. Caching tiers

### Tier 1 — HTTP caching (free, first choice)

```ts
res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
```

Cheapest possible win for public GETs; a CDN or the browser absorbs the load. Everything
authenticated gets `Cache-Control: no-store`.

### Tier 2 — in-process (`node-cache`)

For hot, small, **public**, slow-changing responses. Correct only while there is a single
instance, or while per-instance staleness is acceptable.

```ts
articleRouter.get('/approved/top', cacheMiddleware(CACHE_TTL.TOP_ARTICLES), ...);
```

Guards (both mandatory): skip when `Authorization`/`Cookie` is present; cache only 2xx.

Sizing: `new NodeCache({ stdTTL: 3600, maxKeys: 5000, useClones: false })`. Unbounded caches
become memory leaks. `useClones: false` avoids deep-cloning every hit — safe as long as nobody
mutates a cached body.

### Tier 3 — shared cache (Redis)

Required once there is more than one instance and consistency matters. Log the decision.

### Invalidation

Every cached key documents its invalidation trigger.

```ts
// controllers/article.controller.ts — after a successful publish
invalidateByPrefix('/api/articles/approved');
```

Prefer short TTLs over clever invalidation. A 60-second TTL solves most staleness problems
with none of the bugs.

**Never cache:** authenticated responses, anything with an `Authorization` header, non-2xx
responses, endpoints whose result depends on the actor.

---

## 5. Application-level

| Concern | Rule |
|---|---|
| Parallelism | Independent awaits use `Promise.all`. Sequential awaits that don't depend on each other are wasted latency. |
| Serial dependency | Keep sequential only when the second call needs the first's result. |
| Blocking work | No synchronous CPU work (image resize, PDF, big JSON) on the request path — offload to a job or a worker thread. |
| bcrypt | Cost 12 is ~250 ms of CPU. Only on auth endpoints; never in a loop. |
| JSON | Very large responses should stream, not buffer. |
| Regex | No user-controlled regex; audit for catastrophic backtracking. |
| Logging | `debug` off in production; no logging inside hot loops. |

```ts
// ✅ independent
const [article, tags] = await Promise.all([
  ArticleRepository.findById(id),
  TagRepository.findByArticleId(id),
]);
```

---

## 6. Connection pool tuning

```
connectionLimit × replicas  <  max_connections × 0.8
```

Default `connectionLimit: 20`. Symptoms of a bad setting:

| Symptom | Cause |
|---|---|
| Requests queue, latency climbs, DB idle | pool too small |
| `ER_CON_COUNT_ERROR` / DB refuses connections | pool × replicas too large |
| Pool slowly exhausts and never recovers | leaked connection — a missing `release()` in `finally` |

Log pool stats at `debug` in non-prod to see saturation before production does.

---

## 7. Timeouts everywhere

Nothing waits forever. But **the kind of timeout depends on the kind of call.**

### 7.1 Request/response calls — fixed duration

For a call whose payload is small and bounded, a wall-clock timeout is correct.

```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), TIMEOUT.OUTBOUND_HTTP);
try {
  const response = await fetch(url, { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
```

| Call | Timeout | Why this number |
|---|---|---|
| Outbound HTTP (JSON API) | 5 s | a healthy API answers in < 1 s; 5 s is already a failure |
| SMTP | 10 s | handshake + send; slower than HTTP, still bounded |
| DB query | `maxExecutionTime` hint on long reads | the pool, not the clock, is the real limit |
| HTTP server keep-alive | `server.keepAliveTimeout = 65_000` | must exceed the load balancer's idle timeout, or you get sporadic 502s |

### 7.2 Data transfer — idle timeout, not total duration

**Never put a fixed total-duration timeout on an upload or download.** Transfer time is
`bytes ÷ throughput`, and you control neither term. A 30 s cap fails a legitimate 5 MB upload
from a phone on a train while happily allowing a stalled connection to hold a socket for
29 seconds.

What you actually want to detect is **a stalled transfer**, not a slow one. So time the *gaps
between bytes*, and reset the clock on every chunk of progress:

```ts
// services/storage.service.ts
async function uploadWithIdleTimeout(
  blob: BlockBlobClient,
  data: Buffer,
  idleMs = TIMEOUT.TRANSFER_IDLE,      // 15 s of zero progress = dead
): Promise<Result<string, RequestError>> {
  const controller = new AbortController();
  let timer = setTimeout(() => controller.abort(), idleMs);

  const resetIdleTimer = (): void => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), idleMs);
  };

  try {
    await blob.uploadData(data, {
      abortSignal: controller.signal,
      onProgress: resetIdleTimer,       // progress means alive; start the clock again
    });
    return ok(blob.url);
  } catch (error) {
    logger.error('blob upload failed', { blobName: blob.name, bytes: data.length, error });
    return err(ERRORS.FILE_UPLOAD_FAILED);
  } finally {
    clearTimeout(timer);
  }
}
```

A 200 MB upload over a slow link succeeds as long as it keeps moving. A connection that dies
mid-stream is cut in 15 seconds instead of hanging until the OS gives up.

### 7.3 If the SDK only supports a total duration

Some clients expose no progress callback. Then **derive** the ceiling from the payload size and
a deliberately pessimistic assumed throughput — never hardcode a constant:

```ts
// config/constants.ts
export const TIMEOUT = {
  OUTBOUND_HTTP: 5_000,
  SMTP: 10_000,
  TRANSFER_IDLE: 15_000,
  TRANSFER_MIN: 10_000,                       // floor: covers handshake on a tiny file
  TRANSFER_MAX: 5 * 60_000,                   // absolute backstop
  ASSUMED_THROUGHPUT_BYTES_PER_SEC: 64 * 1024, // ~512 kbps — a bad mobile connection
} as const;

export function transferTimeoutFor(bytes: number): number {
  const budget = (bytes / TIMEOUT.ASSUMED_THROUGHPUT_BYTES_PER_SEC) * 1000;
  return Math.min(Math.max(budget, TIMEOUT.TRANSFER_MIN), TIMEOUT.TRANSFER_MAX);
}
```

Because `UPLOAD.MAX_BYTES` caps images at 5 MB (see
[03-low-level-design.md](03-low-level-design.md) §9), the worst case is bounded and computable:
5 MB ÷ 64 KB/s ≈ 80 s. That is a *derived* number you can defend in review, and it moves
automatically when the upload cap changes. `30_000` is not.

### 7.4 Rules

| # | Rule |
|---|---|
| T1 | Every outbound call has a timeout. No exceptions. |
| T2 | Bounded request/response → fixed duration. Data transfer → idle timeout. |
| T3 | Never a fixed total-duration timeout on a transfer whose size you don't control. |
| T4 | If forced into a total duration, derive it from `MAX_BYTES` and a pessimistic throughput, with a floor and a ceiling. |
| T5 | All values live in `config/constants.ts` as named constants. No inline milliseconds. |
| T6 | Always `clearTimeout` in `finally` — a leaked timer keeps the event loop alive and delays shutdown. |
| T7 | A timeout is a `warn` log with the elapsed time and byte count, and maps to a registry error (`FILE_UPLOAD_FAILED`, not a generic 500). |
| T8 | Long uploads must not hold a DB connection or a transaction open. Upload first, then write the row. |

A missing timeout turns one slow dependency into a full outage as the pool fills with waiting
requests. A *wrong* timeout turns a working feature into an intermittent one, which is harder
to diagnose.

---

## 8. Scaling out

The service is stateless, so scaling is replica count. Before adding replicas, verify:

- [ ] No in-memory state that must be shared (sessions, caches that must be consistent, counters).
- [ ] `connectionLimit × replicas` still fits the DB.
- [ ] Rate limiting is either per-instance-acceptable or backed by Redis.
- [ ] `node-cache` staleness is acceptable per instance, or has moved to Redis.
- [ ] Scheduled jobs run in **one** dedicated container, not in every replica.

---

## 9. Measuring

- Access log includes `durationMs` for every request — that is the primary latency dataset.
- `x-cache: HIT|MISS` header on cacheable routes.
- Slow query log enabled in non-prod; anything > 100 ms is triaged.
- Load test before launch: `autocannon` against the top 5 endpoints, at expected peak × 3.
- **Measure before optimising.** A PR that claims a performance improvement includes before
  and after numbers.

---

## 10. Checklist

- [ ] `EXPLAIN` reviewed for every new query on a large table; composite index covers filter + order.
- [ ] Explicit column lists; list and detail shapes separated.
- [ ] No N+1; independent awaits parallelised.
- [ ] Cursor pagination with `limit + 1`; no `COUNT(*)`, no `OFFSET`.
- [ ] Caching applied only to public GETs, only 2xx, TTL named in `config/constants.ts`, invalidation documented.
- [ ] `compression()` enabled.
- [ ] Every external call has a timeout; transfers use an **idle** timeout, not a fixed duration.
- [ ] Timeout values are named constants, derived rather than magic; `clearTimeout` in `finally`.
- [ ] Pool size sane for replica count; `release()` in `finally` everywhere.
- [ ] No blocking CPU work on the request path.
- [ ] Latency budgets met, with numbers in the PR.
