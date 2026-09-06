# 05 — Logging & Observability

You cannot debug what you cannot see. Every BasicTech service emits structured, correlated,
level-appropriate logs from day one.

---

## 1. The logger

**Backend: Winston**, one labelled logger per module, created via a factory.

```ts
// src/utils/logger.ts
import winston from 'winston';
import { NODE_ENV, LOG_LEVEL } from '@config/env.ts';

const isProd = NODE_ENV === 'production';

const base = winston.createLogger({
  level: LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  defaultMeta: { service: process.env.SERVICE_NAME ?? 'api' },
  format: isProd
    ? winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json())
    : winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        winston.format.printf(({ label, timestamp, level, message, ...meta }) =>
          `[${label}] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`),
      ),
  transports: [new winston.transports.Console()],
});

export default function createLogger(label: string): winston.Logger {
  return base.child({ label });
}
```

**Rules:**

| # | Rule |
|---|---|
| L1 | One logger per module, created at module top-level: `const logger = createLogger('@article.repository');` |
| L2 | Label convention: `@<file-basename>` for backend modules, `@<feature>` for feature-level. |
| L3 | **Production format is JSON.** Human-readable format only when `NODE_ENV !== 'production'`. |
| L4 | **Console transport only.** Do not write log files from the app. The platform (Docker/Azure/K8s) collects stdout. |
| L5 | `console.log` / `console.error` are banned outside `src/config/env.ts` bootstrap failure and `scripts/`. ESLint rule `no-console: error`. |

> The reference backend writes to `error.log` at level `debug` and commits the file.
> Do not do this: it grows unbounded, is lost on container restart, and leaks into git.

**Frontend/mobile:** a thin wrapper in `src/lib/logger.ts` that is a no-op for `debug`/`info`
in production and forwards `warn`/`error` to the crash reporter. Never log PII or tokens.

---

## 2. Log levels — when to use which

| Level | Use for | Examples |
|---|---|---|
| `error` | An operation failed and a human may need to act. Always includes the error object. | unhandled exception, DB unreachable, 5xx response |
| `warn` | Expected-but-notable. Client's fault, or degraded mode. | 4xx response, cache miss storm, retry attempt, deprecated endpoint hit |
| `info` | Business-significant events. Low volume, high value. | server started, article published, user logged in, migration applied |
| `debug` | Developer detail. Off in production. | SQL executed, cache key, external call payload sizes |

Never log at `error` for a 4xx. Never log at `info` inside a loop.

---

## 3. Structured metadata

**Always log an object, never an interpolated string.**

```ts
// bad
logger.error(`Error creating article for author ${authorId}: ${error}`);

// good
logger.error('create article failed', { requestId, authorId, error });
```

Standard metadata keys — use these names exactly:

| Key | Meaning |
|---|---|
| `requestId` | Correlation ID for the HTTP request (see §4) |
| `userId` / `authorId` / `adminId` | Actor |
| `resource`, `resourceId` | Subject of the operation |
| `durationMs` | Elapsed time for the operation |
| `code` | BasicTech error code |
| `statusCode` | HTTP status |
| `error` | The `Error` object (Winston `errors({ stack: true })` serialises it) |

---

## 4. Request correlation

Every request gets an ID at the very first middleware and it flows everywhere.

```ts
// src/middleware/request-id.middleware.ts
export const requestId: RequestHandler = (req, res, next) => {
  const id = req.header('x-request-id') ?? randomUUID();
  req.id = id;
  res.setHeader('x-request-id', id);
  next();
};
```

- Declared on `Express.Request` in `src/types/express.d.ts`.
- Included in **every** log line for that request.
- Returned in the error response body as `requestId`.
- The web/mobile client generates one per user action and sends it as `x-request-id`, so a
  support ticket screenshot maps to a server log line.

### HTTP access log

One `info` line per completed request, emitted by a single middleware:

```ts
logger.info('http', {
  requestId: req.id,
  method: req.method,
  path: req.route?.path ?? req.path,
  statusCode: res.statusCode,
  durationMs,
  userId: req.user?.id,
});
```

Use `req.route.path` (the template, `/articles/:id`) not `req.originalUrl`, so log
aggregation groups correctly and IDs don't explode cardinality.

---

## 5. Redaction — what must never be logged

Blocking review comment if any of these appear in a log:

- Passwords, password hashes, OTPs
- JWTs, refresh tokens, session cookies, API keys, connection strings
- Full request bodies for auth endpoints
- Email addresses and phone numbers in `info`/`debug` (allowed in `error` when needed to
  investigate, if your data policy permits)
- Payment details, government IDs
- Full SQL rows of user data

> The reference `error.middleware.ts` logs the entire `req.body` on every error. That
> logs plaintext passwords on a failed login. **Remove it.** Log the *keys* if you must:
> `bodyKeys: Object.keys(req.body ?? {})`.

Implement a `redact` helper and a Winston format that strips known-sensitive keys
(`password`, `password_hash`, `token`, `refresh_token`, `authorization`, `otp`, `secret`).

---

## 6. What to log where

| Layer | Logs |
|---|---|
| `middleware` | request id, access log, auth failures (`warn`), rate limit hits (`warn`) |
| `routes` | nothing — routes are wiring |
| `controllers` | business-significant `info` events only (`article published`) |
| `repositories` | `error` on every caught exception, with the operation name and inputs (IDs only); `debug` for slow queries |
| `services` (email, storage, 3rd party) | `info` on send/upload success, `error` on failure with provider response code |
| frontend | `error` on unexpected failures forwarded to crash reporting; never `debug` in prod |

---

## 7. Health & readiness

Every service exposes:

| Endpoint | Returns |
|---|---|
| `GET /health` | `200 {status:'ok', uptime, version}` — liveness. No dependency checks. |
| `GET /ready` | `200` only if DB pool responds to `ping()`; else `503`. Used by orchestrator. |

Version comes from an injected build arg (`APP_VERSION`), not `package.json` at runtime.

---

## 8. Metrics & tracing (when the project needs it)

Default posture: logs only. Add metrics when a project has SLOs.

- **Metrics:** `prom-client` exposing `/metrics` — request rate, error rate, p50/p95/p99
  latency by route, DB pool utilisation, cache hit ratio.
- **Tracing:** OpenTelemetry SDK, auto-instrumentation for Express + Postgres. `requestId`
  becomes the trace's baggage.
- **Crash reporting (client):** Sentry for web and mobile. Wire `requestId` as a Sentry tag
  so client and server records join.

Any of these is a notable decision — log it in the module doc and describe the resulting setup
in `project/operations.md`.

---

## 9. Checklist

- [ ] `createLogger('@module')` at the top of every module that logs.
- [ ] Zero `console.*` in `src/`.
- [ ] JSON format in production, console transport only.
- [ ] `requestId` middleware first; ID in every log line and every error response.
- [ ] One access log line per request using the route template.
- [ ] No secrets, tokens, or request bodies in logs.
- [ ] Errors logged where they are caught (repository), not re-logged up the stack.
- [ ] `/health` and `/ready` implemented.
