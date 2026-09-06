# 11 — Environment & Configuration

Configuration is validated once, at startup, in one file. If the environment is wrong, the
process refuses to start — it never fails halfway through a request at 3am.

---

## 1. The one rule

**`process.env` is read in exactly one file: `src/config/env.ts`.**

ESLint enforces it:

```js
{
  files: ['src/**/*.ts'],
  ignores: ['src/config/env.ts'],
  rules: {
    'no-restricted-properties': ['error', {
      object: 'process', property: 'env',
      message: 'Import configuration from @config/env.ts instead.',
    }],
  },
}
```

---

## 2. Validate with Zod, fail fast

```ts
// src/config/env.ts
import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV:  z.enum(['local', 'development', 'staging', 'production']).default('local'),
  PORT:     z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).optional(),
  SERVER_URL: z.url(),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  DB_POOL_LIMIT: z.coerce.number().int().positive().default(20),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('6h'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  CORS_ORIGIN: z.string().transform((s) => s.split(',').map((o) => o.trim())),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  FROM_EMAIL: z.email(),

  STORAGE_CONNECTION_STRING: z.string().min(1),
  STORAGE_CONTAINER_NAME: z.string().min(1).default('images'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // The only permitted console usage in the codebase.
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
export type Env = typeof env;
```

**Why this and not `process.env.X!`:** the reference `config/env.ts` uses `!` assertions, so a
missing `JWT_SECRET` becomes `undefined`, the app boots happily, and every login fails at
runtime with a confusing 500. Zod turns that into a startup failure with the exact key name.

Note that the error message **lists key names only, never values**.

---

## 3. Consuming configuration

```ts
import { env } from '@config/env.ts';

export const db = postgres.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  connectionLimit: env.DB_POOL_LIMIT,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
});
```

Prefer importing the `env` object over individual named exports — one import, and new keys
don't require touching import lists.

---

## 4. `.env.example`

Committed, complete, valueless. It is the documentation for what the app needs.

```dotenv
# App
NODE_ENV=development
APP_ENV=local
PORT=3000
SERVER_URL=http://localhost:3000
LOG_LEVEL=debug

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_POOL_LIMIT=20

# Auth — generate with: openssl rand -base64 48
JWT_SECRET=
JWT_EXPIRES_IN=6h
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=30d

# CORS — comma separated
CORS_ORIGIN=http://localhost:3001

# Mail
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=

# Storage
STORAGE_CONNECTION_STRING=
STORAGE_CONTAINER_NAME=images
```

Adding a key to `EnvSchema` **requires** adding it to `.env.example` in the same commit. A CI
step compares the two and fails on drift.

---

## 5. Client-side configuration (web & mobile)

Client bundles are public. Treat every client env var as published.

| Platform | Public prefix | Where |
|---|---|---|
| Next.js | `NEXT_PUBLIC_` | `.env.local`, deployment env |
| Expo | `EXPO_PUBLIC_` | `.env`, `app.config.ts`, EAS secrets |

Still validate them:

```ts
// src/config/env.ts  (web)
const ClientEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.url(),
  NEXT_PUBLIC_APP_ENV: z.enum(['local', 'development', 'staging', 'production']),
});

export const env = ClientEnvSchema.parse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
});
```

Reference the fields explicitly (not `process.env` wholesale) — bundlers only inline
statically-referenced keys.

**Never** put a server secret, a database URL, a private API key, or an admin token behind a
public prefix. If the client needs privileged data, it goes through our backend.

---

## 6. Feature flags

- Flags are configuration, not code branches that live forever.
- Declared in `EnvSchema` as `z.coerce.boolean().default(false)` or fetched from a flag service.
- Every flag has an owner and a removal date recorded in its module doc.
- A flag that has been fully on in production for 30 days gets deleted along with the dead branch.

---

## 7. Secrets by environment

| Environment | Source |
|---|---|
| local | `.env` (gitignored), values from the team password manager |
| CI | GitHub Actions secrets, scoped to a GitHub Environment |
| staging / production | Platform secret store (Azure Key Vault, AWS Secrets Manager) injected as env vars at deploy |

Never bake secrets into an image. Never pass them as Docker build args (they persist in layers).

---

## 8. Checklist

- [ ] All config keys in `EnvSchema` with the right type and constraints.
- [ ] `.env.example` updated in the same commit.
- [ ] No `process.env` outside `config/env.ts`.
- [ ] No `!` assertions on config values.
- [ ] Startup fails loudly and names the missing key — without printing its value.
- [ ] No secret behind `NEXT_PUBLIC_` / `EXPO_PUBLIC_`.
- [ ] `.env` and `.env.*` are gitignored; only `.env.example` is tracked.
