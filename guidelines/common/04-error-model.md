# 04 — Error Model

One error model, end to end. A failure that starts in a Postgres driver arrives at a React
component as the *same* shape, with the *same* code, and can be handled without string matching.

---

## 1. The `RequestError` class

Identical definition on backend and frontend (frontend copy lives in `src/lib/api.ts`).

```ts
export class RequestError extends Error {
  readonly code: number;       // stable BasicTech error code, see §3
  readonly statusCode: number; // HTTP status

  constructor(message: string, code: number, statusCode: number) {
    super(message);
    this.name = 'RequestError';
    this.code = code;
    this.statusCode = statusCode;
    if (Error.captureStackTrace) Error.captureStackTrace(this, RequestError);
  }
}

export function isRequestError(e: unknown): e is RequestError {
  return e instanceof RequestError;
}
```

`message` is **safe to show to an end user**. Never put SQL, stack traces, IDs of other users,
or internal hostnames in it. Debug detail goes to the logger, not the message.

---

## 2. `neverthrow` on the backend

Every backend function that can fail returns `Result<T, RequestError>`.

```ts
import { Result, ok, err } from 'neverthrow';

async findById(id: number): Promise<Result<Article, RequestError>> {
  try {
    const [rows] = await db.query<Article[]>('SELECT * FROM articles WHERE id = ?', [id]);
    const article = rows[0];
    if (article === undefined) return err(ERRORS.ARTICLE_NOT_FOUND);
    return ok(article);
  } catch (error) {
    logger.error('findById failed', { id, error });
    return err(ERRORS.DATABASE_ERROR);
  }
}
```

**Rules:**

| # | Rule |
|---|---|
| E1 | `try/catch` exists **only** at the repository/service boundary where a third-party library throws. It never leaks past that function. |
| E2 | Controllers and repositories never `throw`. They return `err(...)`. |
| E3 | The only place a `Result` is unwrapped is the route handler, via `.match()`. |
| E4 | Propagate with `if (result.isErr()) return err(result.error);` — never re-wrap into a generic error, you would lose the specific code. |
| E5 | Never `._unsafeUnwrap()` in application code. Test code only. |
| E6 | Chain with `.map()` / `.andThen()` when it's a pure transform; use explicit `isErr()` guards when there is branching logic. |

Route-handler termination — this exact shape, everywhere:

```ts
const result = await getTrendingTags();
result.match(
  (data)  => res.json(successResponse(data, 'Trending tags fetched successfully')),
  (error) => next(error),
);
```

`next(error)` hands it to the central error middleware. A route handler **never** builds an
error response itself.

---

## 3. The `ERRORS` registry

All errors live in one file: `src/utils/errors.ts`. Nothing constructs a `RequestError`
inline; you reference a registry entry.

### Code ranges

| Range | Domain |
|---|---|
| `1xxxx` | Common / infrastructure |
| `2xxxx` | Authentication & authorization |
| `3xxxx` | User / author domain |
| `4xxxx` | Admin domain |
| `5xxxx` | Primary content domain (articles) |
| `6xxxx` | Secondary content domain (web stories) |
| `7xxxx` | File / media |
| `8xxxx` | Advertising / monetisation |
| `9xxxx` | Third-party integrations |

Per project, redefine `3xxxx`–`9xxxx` in the plan document. `1xxxx` and `2xxxx` are **fixed
across all BasicTech projects** so that shared client code can handle them generically.

### Fixed common codes

```ts
export const ERRORS = {
  // 1xxxx — common
  DATABASE_ERROR:         new RequestError('Database operation failed', 10001, 500),
  INVALID_REQUEST_BODY:   new RequestError('Invalid request body',      10002, 400),
  INVALID_QUERY_PARAMETER:new RequestError('Invalid query parameters',  10003, 400),
  UNHANDLED_ERROR:        new RequestError('An unexpected error occurred', 10004, 500),
  INTERNAL_SERVER_ERROR:  new RequestError('Internal server error',     10005, 500),
  ROUTE_NOT_FOUND:        new RequestError('Route not found',           10006, 404),
  INVALID_PARAMS:         new RequestError('Invalid parameters',        10007, 400),
  VALIDATION_ERROR:       new RequestError('Validation failed',         10008, 422),
  RESOURCE_NOT_FOUND:     new RequestError('Resource not found',        10009, 404),
  DUPLICATE_RESOURCE:     new RequestError('Resource already exists',   10010, 409),
  RATE_LIMITED:           new RequestError('Too many requests',         10011, 429),
  PAYLOAD_TOO_LARGE:      new RequestError('Payload too large',         10012, 413),

  // 2xxxx — auth
  NO_TOKEN_PROVIDED:      new RequestError('No authentication token provided', 20001, 401),
  INVALID_AUTH_TOKEN:     new RequestError('Invalid authentication token',     20002, 401),
  TOKEN_EXPIRED:          new RequestError('Authentication token has expired', 20003, 401),
  INVALID_REFRESH_TOKEN:  new RequestError('Invalid refresh token',            20004, 401),
  UNAUTHORIZED:           new RequestError('Unauthorized access',              20005, 401),
  FORBIDDEN:              new RequestError('Access forbidden',                 20006, 403),
  ADMIN_ONLY_ROUTE:       new RequestError('Admin access required',            20007, 403),
  INSUFFICIENT_PERMISSIONS: new RequestError('Insufficient permissions',       20009, 403),
} as const;
```

### Registry rules

| # | Rule |
|---|---|
| R1 | Codes are **immutable once shipped**. Never reuse or renumber. Deprecate by comment. |
| R2 | Allocate the next free number in the range. Gaps are fine. |
| R3 | Group with a comment header per range; keep numerically sorted. |
| R4 | Message is user-safe, sentence case, no trailing period, no interpolation. |
| R5 | Adding a code = updating `docs/error-codes.md` (generated) in the same PR. |
| R6 | The frontend must not hardcode numeric literals; import a shared `ERROR_CODES` const. |

### HTTP status mapping

| Situation | Status |
|---|---|
| Malformed body/params (parse failed) | 400 |
| Semantically invalid but well-formed | 422 |
| No/invalid credentials | 401 |
| Authenticated but not allowed | 403 |
| Resource does not exist | 404 |
| State conflict / duplicate | 409 |
| Rate limited | 429 |
| Anything unexpected | 500 |

---

## 4. Central error middleware (backend)

`src/middleware/error.middleware.ts` is the **only** place that converts an error into a
response body.

```ts
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const requestId = req.id;

  if (isRequestError(error)) {
    if (error.statusCode >= 500) {
      logger.error('request failed', { requestId, code: error.code, path: req.path, error });
    } else {
      logger.warn('request rejected', { requestId, code: error.code, path: req.path });
    }
    res.status(error.statusCode).json(errorResponse(error.message, error.code, requestId));
    return;
  }

  const mapped = mapKnownThrowable(error);   // JWT errors, ER_DUP_ENTRY, JSON SyntaxError, ...
  if (mapped) {
    logger.warn('mapped throwable', { requestId, code: mapped.code, path: req.path });
    res.status(mapped.statusCode).json(errorResponse(mapped.message, mapped.code, requestId));
    return;
  }

  logger.error('unhandled error', { requestId, path: req.path, method: req.method, error });
  res.status(500).json(errorResponse(ERRORS.UNHANDLED_ERROR.message, ERRORS.UNHANDLED_ERROR.code, requestId));
};
```

**Non-negotiable:** never echo `error.message` of an unknown throwable to the client, in any
environment. Environment-conditional detail leaks in staging and eventually in prod. Put the
detail in the log and give the client the `requestId`.

Registration order in `app.ts` (order matters):

```ts
app.use(requestId);
app.use(limiter);
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(httpLogger);

app.get('/health', healthHandler);
app.use('/api/articles', articleRouter);
// ... all routers

app.use(notFoundHandler);   // 404 — after all routes
app.use(errorHandler);      // MUST be last, and MUST be registered
```

> The reference backend registers `notFoundHandler` but **not** `errorHandler` at app level.
> That is a bug. Always register `errorHandler` last.

---

## 5. Response envelope

Both shapes live in `src/utils/response.ts` and are the only response builders.

```ts
// success
{
  "success": true,
  "message": "Articles fetched successfully",
  "data": <T | T[]>,
  "pagination": { "hasNext": true, "nextCursor": 42 },   // only when paginated
  "timestamp": "2026-09-02T10:00:00.000Z"
}

// error
{
  "success": false,
  "error": { "code": 50001, "message": "Article not found" },
  "requestId": "01J8Z...",
  "timestamp": "2026-09-02T10:00:00.000Z"
}
```

---

## 6. Frontend error handling

The frontend service layer is the mirror image: it **throws** `RequestError`, because
TanStack Query's contract is exception-based.

```ts
// src/lib/api.ts
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const raw: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = ErrorEnvelopeSchema.safeParse(raw);
    throw parsed.success
      ? new RequestError(parsed.data.error.message, parsed.data.error.code, response.status)
      : new RequestError('Request failed', ERROR_CODES.UNHANDLED_ERROR, response.status);
  }
  return SuccessEnvelopeSchema.parse(raw) as ApiResponse<T>;
}
```

> **Bug to avoid** (present in the reference `api.ts`): wrapping the whole body in a
> `try/catch` that re-throws `new RequestError(msg, 0, 500)` destroys the real code and
> status. Do not catch-and-rewrap. Let `RequestError` propagate; only map genuine network
> failures (`TypeError: Failed to fetch`) into a dedicated `NETWORK_ERROR`.

### Handling in the UI

| Layer | Responsibility |
|---|---|
| `services/` | Throw `RequestError`. Parse the success payload with Zod. No UI concerns. |
| `hooks/` | Expose `{ data, isLoading, error }` from TanStack Query. Decide `retry`. Never render. |
| components | Render the three states. Map `error.code` to a message via a shared `errorMessages` map. Never `error.message.includes('...')`. |
| global | An `ErrorBoundary` per route group + a `sonner` toast for mutation failures. |

```ts
// hooks — auth errors must not be retried
useQuery({
  queryKey: ['articleById', id],
  queryFn: () => fetchArticleById(id),
  staleTime: 10 * 60 * 1000,
  retry: (failureCount, error) =>
    isRequestError(error) && error.statusCode >= 500 && failureCount < 2,
});
```

---

## 7. Error handling checklist

- [ ] Every failure path returns/throws a registry error, never an ad-hoc one.
- [ ] No `try/catch` outside a third-party boundary.
- [ ] No `throw` in a backend controller or repository.
- [ ] Route handlers end in `.match(onOk, next)`.
- [ ] `errorHandler` is registered last in `app.ts`.
- [ ] Unknown errors log full detail, return a generic message + `requestId`.
- [ ] Frontend never string-matches on error messages.
- [ ] A test exists for each distinct error code a function can produce.
