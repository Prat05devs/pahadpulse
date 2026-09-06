# 07 — Security

Baseline security posture for every BasicTech project. None of this is optional, and none of
it is a "phase 2" item.

---

## 1. Secrets

| # | Rule |
|---|---|
| S1 | Secrets come from environment variables only. No secret literal ever enters git. |
| S2 | `.env`, `.env.*` are gitignored. **Only** `.env.example` (keys, no values) is committed. |
| S3 | `process.env` is read in exactly one file: `src/config/env.ts`. Everything else imports from it. |
| S4 | Production secrets live in the platform secret store (Azure Key Vault / GitHub Actions secrets), never in a `.env` on a server. |
| S5 | Rotate on exposure. If a secret is ever committed, rotate it — scrubbing history is not enough. |
| S6 | `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` values are **public**. Never put a key there that grants write access. |

> The reference backend has `.env` and `.env.azure` present in the repo root. Verify they are
> gitignored and that no historical commit contains them.

Pre-commit secret scanning (`gitleaks`) runs in the hook and in CI.

---

## 2. Injection

**SQL:** parameterised queries only. `db.query(sql, params)`. Never template-literal a value
into SQL.

```ts
// banned
db.query(`SELECT * FROM articles WHERE id = ${id}`);

// required
db.query('SELECT * FROM articles WHERE id = ?', [id]);
```

Dynamic *structure* (which columns to update, sort field) is built from a **whitelist**, never
from user input:

```ts
const SORTABLE = { created_at: 'created_at', title: 'title' } as const;
const column = SORTABLE[sort];              // undefined if not whitelisted
if (!column) return err(ERRORS.INVALID_QUERY_PARAMETER);
```

`LIMIT`/`OFFSET` are still parameters — pg supports `LIMIT ?` with the number in the array.

**Command injection:** no `child_process` with interpolated input. If unavoidable, use
`execFile` with an argument array.

**NoSQL/ORM:** not applicable today (raw Postgres), but the same rule holds if introduced.

---

## 3. Authentication

- Passwords: **bcrypt, cost ≥ 12**. Never MD5/SHA. Never store plaintext, never log the hash.
- Password policy: min 12 chars, checked against a common-password list. (The reference's
  6-char minimum is too low — raise it.)
- Login responses are **uniform**: same message and same timing for "no such user" and "wrong
  password" (`INVALID_CREDENTIALS`, 401). Never reveal which one it was.
- Brute force: per-IP **and** per-account rate limiting on login, plus exponential backoff or
  temporary lock after N failures.
- OTP: 6+ digits, cryptographically random (`crypto.randomInt`), single use, ≤ 10 min TTL,
  stored hashed, invalidated on use, rate-limited on both send and verify.

### JWT

| Setting | Value |
|---|---|
| Algorithm | `HS256` with a ≥ 32-byte random secret, or `RS256` for multi-service |
| Access token TTL | **6 hours**. Revocation lag equals the TTL — see [backend/09-security.md](../backend/09-security.md) §2.1. |
| Refresh token TTL | ≤ 30 days, rotating, single-use, revocable (stored hashed server-side) |
| Verify | Always specify `algorithms: ['HS256']` — prevents `alg: none` and algorithm confusion |
| Payload | `sub`, `role` only. Validate with Zod after decode. |
| Storage (web) | Refresh token in an httpOnly+Secure+SameSite=Strict cookie. Access token in memory. |

> **`localStorage` for tokens is XSS-exposed.** The reference frontend stores `auth_token` in
> `localStorage`; new projects must use the httpOnly-cookie + in-memory access token pattern.
> If a project must keep `localStorage` for a migration period, log it in the auth module doc
> with a
> hard CSP.

- Never decode a JWT on the client to make a *security* decision. Client-side `exp` checks are
  a UX optimisation only; the server re-verifies every time.

---

## 4. Authorization

- Enforced in middleware on the server for **every** protected route: `authenticate` then
  `requireRole(...)`.
- **Ownership checks are separate from role checks.** An author with a valid token must still
  be proven to own article 42 before updating it. Do this in the controller, against the DB —
  not from a client-supplied `authorId`.

```ts
const article = await ArticleRepository.findById(id);
if (article.isErr()) return err(article.error);
if (article.value.author_id !== actor.id && actor.role !== Role.Admin) {
  return err(ERRORS.ARTICLE_PERMISSION_DENIED);
}
```

- Never trust an ID from the request body to identify the actor. The actor is `req.user.sub`.
  (The reference `CREATE_ARTICLE` schema accepts `authorId` from the body — that is an IDOR;
  take it from the token instead.)
- Default deny: a new route is unauthenticated only if its module doc explicitly marks it public.

---

## 5. Transport & headers

- HTTPS only in every non-local environment. HSTS with `max-age=31536000; includeSubDomains`.
- `helmet()` mounted first in the middleware chain. See
  [backend/09-security.md](../backend/09-security.md) §1.1 for what it sets and why.
- CORS: explicit allowlist from `CORS_ORIGIN`, `credentials: true`. **Never** `origin: '*'`
  or `origin: true` with credentials, and never reflect the request origin back. See
  [backend/09-security.md](../backend/09-security.md) §1.2.
- CSP on the web app: no `unsafe-eval`; `unsafe-inline` only for styles until nonces are wired.
- Cookies: `httpOnly`, `secure`, `sameSite: 'strict'` (or `'lax'` where cross-site nav is
  needed), scoped `path`, explicit `maxAge`.

---

## 6. Input & output handling

- Every request boundary validated with Zod (see `06-api-contract.md`).
- Body size limits: `express.json({ limit: '1mb' })` for JSON APIs; only file upload routes get
  a larger limit, applied on that route, not globally. (The reference sets 10mb globally —
  narrow it.)
- Uploads: validate **magic bytes**, not just MIME type or extension; cap size; generate a new
  random filename; store outside the web root / in object storage; never serve from a path
  built from user input.
- Output: React escapes by default. `dangerouslySetInnerHTML` requires sanitised HTML
  (`DOMPurify`) and a code comment justifying it. Markdown rendering must disable raw HTML.
- Redirects: only to a relative path or a host on an allowlist.

---

## 7. Rate limiting

- Global limiter on all `/api` routes.
- Stricter limiter on auth endpoints (login, refresh, OTP send/verify, password reset).
- Keyed by IP **and**, when authenticated, by user ID.
- Behind a proxy, set `app.set('trust proxy', 1)` so the limiter sees the real client IP.
- Return `429` with the `RATE_LIMITED` registry code and a `Retry-After` header.

---

## 8. Dependencies & supply chain

- `npm audit --omit=dev` in CI; high/critical vulnerabilities block the merge.
- Dependabot/Renovate enabled; security patches merged within one week.
- New dependency is a deliberate decision logged in the module doc that uses it: what it does,
  why nothing existing does it, maintenance
  status, transitive weight, licence.
- Lockfile committed; CI uses `npm ci`. `ignore-scripts` where practical.

---

## 9. Data protection

- Log redaction per [05-logging-and-observability.md](05-logging-and-observability.md#5-redaction--what-must-never-be-logged).
- Error responses never leak stack traces, SQL, or internal paths — in any environment.
- PII columns identified in the schema doc; deletion path defined per the project's retention
  policy.
- Database credentials are least-privilege: the app user gets DML on its own schema, not
  `GRANT ALL`. No `root` in a connection string.
- Backups encrypted; restore tested at least once per project.

---

## 10. Things that must never be committed

`.env`, `.env.*` (except `.example`) · private keys / `*.pem` · database data directories
(`database/db_data/`) · `error.log` and any log file · `node_modules/` · `.next/`, `dist/`
· `.DS_Store` · fixture files containing real user data.

Required `.gitignore` baseline:

```gitignore
node_modules/
dist/
build/
.next/
coverage/
*.log
.env
.env.*
!.env.example
*.pem
*.key
database/db_data/
.DS_Store
.idea/
.vscode/*
!.vscode/extensions.json
```

---

## 11. Checklist (attach to every PR touching auth, data, or uploads)

- [ ] No secret, key, or token in the diff.
- [ ] All SQL parameterised; any dynamic identifier comes from a whitelist.
- [ ] Route is authenticated and role-checked; ownership verified against the DB.
- [ ] Actor identity taken from the token, never from the body.
- [ ] Input validated with Zod at the boundary; body size limit appropriate.
- [ ] Errors return registry codes, no internal detail.
- [ ] Nothing sensitive logged.
- [ ] Rate limiting applies to this route.
- [ ] New dependency is logged in the module doc and passes `npm audit`.
