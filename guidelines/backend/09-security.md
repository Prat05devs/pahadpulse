# Backend — 09 Security

Server-side application of [common/07-security.md](../common/07-security.md). This is the
layer where security is actually enforced — the client is only ever a convenience.

---

## 1. Middleware baseline

```ts
app.set('trust proxy', 1);                       // real client IP behind a load balancer

app.use(requestId);
app.use(helmet({
  contentSecurityPolicy: false,                  // API serves JSON; CSP belongs on the web app
  crossOriginResourcePolicy: { policy: 'same-site' },
  hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
}));
app.use(globalLimiter);
app.use(cors({
  origin: env.CORS_ORIGIN,                       // array from a comma-separated env var
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  maxAge: 86_400,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(httpLogger);
```

Order matters: `requestId` first so every later log line correlates, `helmet` before anything
can respond, and the rate limiter before auth so a credential-stuffing flood is rejected
without touching bcrypt or the database.

### 1.1 What `helmet` does

It sets a set of defensive response headers that browsers enforce. One line, no runtime cost.

| Header | Protects against |
|---|---|
| `X-Content-Type-Options: nosniff` | MIME sniffing — a JSON response being executed as HTML/JS |
| `X-Frame-Options: DENY` | clickjacking |
| `Strict-Transport-Security` | protocol downgrade / SSL stripping |
| `Referrer-Policy` | leaking full URLs (with IDs and tokens) to third parties |
| `X-DNS-Prefetch-Control`, `X-Download-Options`, `X-Permitted-Cross-Domain-Policies` | assorted legacy attack surface |
| removes `X-Powered-By` | version fingerprinting |

`contentSecurityPolicy: false` is deliberate: a JSON API has no scripts to constrain, and CSP
belongs on the web app where it can be tuned per route — see
[frontend/10-performance-and-seo.md](../frontend/10-performance-and-seo.md) §9.

**Status in `hills-quills-backend`: not installed.** `npm i helmet` and mount it as above.
This is deviation **B16** in
[common/15-known-deviations.md](../common/15-known-deviations.md), tracked as hardening work —
not something to fix inside an unrelated feature PR.

### 1.2 CORS — the one setting people get wrong

```ts
// ❌ blocking. Any site on the internet can read authenticated responses.
app.use(cors({ origin: '*', credentials: true }));

// ❌ blocking. Reflecting the request origin is `*` with extra steps.
app.use(cors({ origin: true, credentials: true }));
app.use(cors({ origin: (o, cb) => cb(null, true), credentials: true }));

// ✅ explicit allowlist, parsed from a comma-separated env var
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
```

`origin: '*'` is *only* acceptable on a fully public, unauthenticated, read-only API — and even
then browsers refuse to combine it with `credentials: true`, so pairing them silently breaks
the app **and** signals that nobody checked. The allowlist is validated at startup by
`EnvSchema` (see [common/11-environment-and-configuration.md](../common/11-environment-and-configuration.md)),
so a typo fails the deploy rather than leaking in production.

---

## 2. Authentication

### Password storage

```ts
import bcrypt from 'bcryptjs';
import { AUTH } from '@config/constants.ts';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, AUTH.BCRYPT_ROUNDS);      // 12
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

### Login — uniform failure

```ts
export async function login(email: string, password: string): Promise<Result<Tokens, RequestError>> {
  const found = await AuthorRepository.findByEmail(email);

  // Always run a bcrypt comparison, even when the user does not exist, so the response
  // time does not reveal account existence.
  const hash = found.isOk() ? found.value.password_hash : DUMMY_HASH;
  const valid = await verifyPassword(password, hash);

  if (found.isErr() || !valid) return err(ERRORS.INVALID_CREDENTIALS);
  if (!found.value.is_active) return err(ERRORS.ACCOUNT_DISABLED);

  logger.info('login succeeded', { actorId: found.value.id });
  return ok(issueTokens(found.value));
}
```

Same error code, same message, same timing for "no such account" and "wrong password". Never
`AUTHOR_NOT_FOUND` on a login endpoint — that is an account-enumeration oracle.

### JWT

```ts
const TokenPayloadSchema = z.object({
  sub: z.coerce.number().int().positive(),
  role: z.enum(Role),
  iat: z.number(),
  exp: z.number(),
});

export function createAuthToken(actor: Actor): string {
  return jwt.sign({ sub: actor.id, role: actor.role }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN,                  // 6h — see §2.1
    issuer: 'basictech-api',
    audience: 'basictech-clients',
  });
}

export function decodeAuthToken(token: string): Result<Actor, RequestError> {
  try {
    const raw = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],                        // MUST be explicit — blocks alg confusion
      issuer: 'basictech-api',
      audience: 'basictech-clients',
    });
    const payload = TokenPayloadSchema.parse(raw);
    return ok({ id: payload.sub, role: payload.role });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) return err(ERRORS.TOKEN_EXPIRED);
    return err(ERRORS.INVALID_AUTH_TOKEN);
  }
}
```

| Rule | Value |
|---|---|
| Algorithm | `HS256`, secret ≥ 32 bytes (Zod-enforced in `EnvSchema`) |
| `algorithms` on verify | **always** specified |
| Access TTL | **6 hours** (`JWT_EXPIRES_IN=6h`) — see §2.1 |
| Payload | `sub`, `role` only — no email, no name, no mutable profile data |
| Refresh token | separate secret, ≤ 30 days, **stored hashed in the DB**, single-use, rotated on each refresh, revocable |
| Logout | deletes the stored refresh token; the access token expires on its own |
| Transport | refresh token in an `httpOnly; Secure; SameSite=Strict` cookie |

Payload validation with Zod after `verify` matters: a token signed with a valid secret but a
malformed payload must not become a partially-populated `Actor`.

### 2.1 Access token TTL — 6 hours, and the tradeoff we accept

**Session length is not access-token TTL.** How long a user stays logged in is governed by the
*refresh* token (30 days). A short access token does not log anyone out — the client silently
refreshes. So "users shouldn't have to log in again" is an argument for a working refresh flow,
not for a long access token.

A JWT is stateless: **once signed, it is valid until it expires and nothing can take it back.**
Whatever TTL you pick is therefore also your revocation lag.

| TTL | Refresh traffic | Damage window if a token leaks | Lag before a deactivation or role change takes effect |
|---|---|---|---|
| 15 min | one per client per 15 min | 15 min | 15 min |
| **6 hours** | **one per client per 6 h** | **6 hours** | **6 hours** |
| 2 days | one per client per 2 days | 2 days | 2 days |

**6 hours is the standard.** It keeps refresh traffic negligible and tolerates a simple client,
while keeping the revocation lag inside a single working day.

**The accepted consequence:** deactivating an account, deleting its refresh token, or changing
its role does **not** take effect immediately. The user keeps whatever access their existing
token grants for up to 6 more hours. We accept this rather than adding a per-request revocation
check, because that check costs a lookup on every authenticated request and a column on every
account table — complexity we don't want for a rare event.

Anything above `24h` needs a logged decision.

### 2.2 Break glass — revoking immediately when you must

If an account is genuinely compromised and 6 hours is too long to wait, there is a zero-code
lever: **rotate `JWT_SECRET`.** Every existing access token fails verification instantly.

```bash
# 1. generate a new secret
openssl rand -base64 48
# 2. update JWT_SECRET in the platform secret store
# 3. restart / redeploy
```

Cost: every user is signed out and must log in again. That is the right trade for a genuine
incident, and it needs no extra logic in the normal path.

Also do the ordinary things, which *are* immediate:

| Action | Effect |
|---|---|
| Delete the account's refresh token(s) | they cannot obtain a **new** access token |
| Set `is_active = 0` | login is refused; ownership checks that read the row can also refuse |
| Rotate `JWT_SECRET` | all existing tokens die immediately, for everyone |

Because ownership and state checks in controllers read the account row from the database
(see §3), a deactivated user is already blocked from most **write** paths within one request —
the 6-hour lag applies mainly to reads that only check the token's `role` claim.

### 2.3 Configuration

```ts
// config/env.ts
JWT_EXPIRES_IN: z.string().default('6h'),
JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
```

Both are env-driven, so a higher-risk deployment can shorten them without a code change.
Anything above `24h` for an access token needs a logged decision.

### OTP

`crypto.randomInt(100000, 1000000)`, stored **hashed**, ≤ 10 min TTL, single-use, deleted on
verify, rate-limited on send *and* verify, max 5 attempts then invalidate.

---

## 3. Authorization

Two independent checks, in this order:

```ts
// 1. Role — middleware, no DB access needed
articleRouter.patch('/:id/status', authenticate, requireRole(Role.Admin), ...);

// 2. Ownership — controller, needs DB state
const existing = await ArticleRepository.findById(id);
if (existing.isErr()) return err(existing.error);
if (existing.value.author_id !== actor.id && actor.role !== Role.Admin) {
  logger.warn('ownership check failed', { actorId: actor.id, articleId: id });
  return err(ERRORS.ARTICLE_PERMISSION_DENIED);
}
```

| # | Rule |
|---|---|
| A1 | The actor is `req.actor`, derived from the token. **Never** an ID from the body or query. |
| A2 | Default deny. A route without `authenticate` must be explicitly marked public in its module doc. |
| A3 | Ownership is checked against the database, on every mutating request. |
| A4 | Return the same code for "doesn't exist" and "exists but not yours" when the existence itself is sensitive — otherwise IDs become enumerable. |
| A5 | Log denied attempts at `warn` with `actorId` and the resource ID. |

### IDOR checklist

For every endpoint that takes an ID: *if I substitute another user's ID, what happens?*
The answer must be 403/404, proven by a test.

---

## 4. Injection defence

- Parameterised queries, always. See [05-database.md](05-database.md#4-query-rules).
- `multipleStatements: false` in the pool config.
- Dynamic identifiers (sort column, update fields) from a literal-union whitelist.
- No `child_process` with interpolated input.
- The unit-test assertion `expect(mockQuery).toHaveBeenCalledWith(sql, [value])` is a standing
  guard — keep it in every repository test.

---

## 5. File uploads

```ts
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD.MAX_BYTES, files: 1, fields: 10 },
  fileFilter: (_req, file, cb) => cb(null, UPLOAD.ALLOWED_MIME.includes(file.mimetype)),
}).single('image');
```

Then, before storing:

1. `fileTypeFromBuffer(file.buffer)` — verify **magic bytes** match the declared MIME. A
   `.png` that is actually a PHP file must be rejected here.
2. Re-encode the image (sharp) to strip EXIF, embedded payloads, and any polyglot content.
3. Filename = `${randomUUID()}.${ext}` derived from the *detected* type, never from
   `originalname`.
4. Store in object storage, not on the app's filesystem. Return the URL.
5. Never build a filesystem path from user input (path traversal).
6. Serve user content from a separate domain or with `Content-Disposition: attachment` +
   `X-Content-Type-Options: nosniff`.

Require authentication on the upload endpoint and rate-limit it — anonymous upload is a free
CDN for attackers.

---

## 6. Rate limiting

| Scope | Window | Limit | Key |
|---|---|---|---|
| Global `/api` | 15 min | 1000 | IP |
| Login / refresh | 15 min | 10 | IP + email |
| OTP send | 1 hour | 5 | email |
| OTP verify | 15 min | 5 | email |
| Upload | 1 hour | 50 | actor ID |
| Search | 1 min | 30 | IP |

All return `429` with `ERRORS.RATE_LIMITED` and `Retry-After`. Requires `trust proxy`.

---

## 7. Caching and data leakage

The cache middleware **must** skip any request carrying `Authorization` or `Cookie`, and must
cache only 2xx. See [04-api-design.md](04-api-design.md#8-caching). This is the most likely
place for an accidental cross-user data leak in this architecture.

---

## 8. Secrets & configuration

- `EnvSchema` requires `JWT_SECRET` and `JWT_REFRESH_SECRET` to be ≥ 32 chars — a weak secret
  fails at startup instead of silently weakening every token.
- DB user has DML on its own schema only. Never `root`.
- No secrets in Docker build args, image layers, or logs.
- Startup validation errors print key **names**, never values.

---

## 9. Response hygiene

- Never return a stack trace, SQL, internal path, or hostname.
- Never return `error.message` from an unknown throwable.
- Strip `password_hash` (and any secret column) from every response — use explicit column
  lists in `SELECT`, not object deletion after the fact.
- `X-Powered-By` disabled (helmet does this).
- Errors include `requestId` for support correlation.

---

## 10. Checklist

- [ ] `helmet`, `trust proxy`, CORS allowlist, 1mb body limit in place.
- [ ] bcrypt cost ≥ 12; uniform login failure; timing-safe comparison path.
- [ ] JWT verified with explicit `algorithms`, `issuer`, `audience`; payload Zod-validated.
- [ ] Access token TTL is 6 h (`JWT_EXPIRES_IN=6h`); anything above 24 h has a logged decision.
- [ ] Refresh token hashed, rotating, revocable, httpOnly cookie.
- [ ] Every mutating endpoint checks role **and** ownership against the DB.
- [ ] Actor never taken from the request body.
- [ ] Every query parameterised; dynamic identifiers whitelisted.
- [ ] Uploads: magic-byte check, re-encode, random filename, object storage, authenticated, rate-limited.
- [ ] Cache never applied to authenticated requests; only 2xx cached.
- [ ] `password_hash` never in a `SELECT` list that reaches a response.
- [ ] IDOR test exists for every ID-taking endpoint.
