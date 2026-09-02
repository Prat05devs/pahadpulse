# Backend — 11 Build, Deployment & Operations

---

## 1. Build

TypeScript does **not** rewrite path aliases on emit. A build that typechecks can still crash
at runtime with `Cannot find module '@utils/logger'`. Handle it explicitly.

```jsonc
// tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "noEmit": false, "outDir": "dist", "sourceMap": true },
  "exclude": ["node_modules", "dist", "**/*.test.ts", "src/__tests__/**"]
}
```

```jsonc
"scripts": {
  "dev":       "tsx watch src/server.ts",
  "build":     "rimraf dist && tsc -p tsconfig.build.json && tsc-alias -p tsconfig.build.json",
  "start":     "node dist/server.js",
  "typecheck": "tsc --noEmit"
}
```

Verify the build actually runs before shipping: `npm run build && npm start` locally, with a
clean `dist/`. "It compiles" is not "it runs".

---

## 2. Docker image

Multi-stage, non-root, no dev dependencies, no source in the final layer.

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache tini
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
```

Rules:

- `npm ci`, never `npm install`.
- `USER node` — never run as root.
- `tini` as PID 1 so `SIGTERM` reaches Node and graceful shutdown works.
- No secrets in `ARG`/`ENV` — they persist in image layers.
- Pin the base image by major version; rebuild weekly for patches.
- Tag images immutably: `registry/app:<git-sha>`. `latest` is not a deployable tag.

`.dockerignore`:

```
node_modules
.git
.env*
dist
coverage
database/db_data
*.log
.github
```

---

## 3. Local development

```yaml
# docker-compose.yml — dependencies only; the app runs on the host
services:
  db:
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:-root}
      MYSQL_DATABASE: ${DB_NAME:-app_dev}
      MYSQL_USER: ${DB_USER:-app}
      MYSQL_PASSWORD: ${DB_PASSWORD:-app}
    ports: ['3306:3306']
    volumes: ['db_data:/var/lib/mysql']       # named volume — NOT ./database/db_data
    healthcheck:
      test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost']
      interval: 5s
      retries: 10

  mailhog:
    image: mailhog/mailhog
    ports: ['1025:1025', '8025:8025']

volumes:
  db_data:
```

Onboarding, from zero to running:

```bash
cp .env.example .env    # fill values
docker compose up -d
npm ci
npm run db:migrate && npm run db:seed
npm run dev
```

---

## 4. Migrations in the deploy pipeline

Order matters. Migrations run **before** the new image serves traffic, and must be
backward-compatible with the currently-running version.

```
1. Run migrations (backward-compatible only)
2. Deploy new image (rolling)
3. Wait for /ready on new instances
4. Drain and stop old instances
5. Later release: contract (drop old columns)
```

This is the **expand → migrate → contract** pattern. Renaming a column in one deploy will
break every in-flight request from the old version. Always: add new → dual-write → backfill →
switch reads → drop old, across at least two releases.

Migration runner requirements: applied-migration ledger table, advisory lock so concurrent
deploys can't double-apply, fails the deploy on error, and is idempotent.

---

## 5. Graceful shutdown

```ts
const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  logger.info('shutdown started', { signal });
  server.close(async () => {
    try {
      await closeDatabase();
      logger.info('shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('shutdown failed', { error });
      process.exit(1);
    }
  });
  setTimeout(() => { logger.error('shutdown timed out'); process.exit(1); }, 10_000).unref();
};

process.on('SIGTERM', (s) => void shutdown(s));
process.on('SIGINT',  (s) => void shutdown(s));
```

Also set `server.keepAliveTimeout = 65_000` and `server.headersTimeout = 66_000` — both must
exceed the load balancer's idle timeout, or you get sporadic 502s.

---

## 6. Health, readiness, and rollout

| Endpoint | Semantics | Checks |
|---|---|---|
| `GET /health` | liveness — is the process alive? | nothing external. Returns `{status, uptime, version}` |
| `GET /ready` | readiness — should it receive traffic? | `db.getConnection().ping()`, plus any hard dependency |

`/health` must **not** check the database. If it does, a brief DB blip restarts every
container simultaneously and turns a small incident into an outage.

Rolling deploy: `maxUnavailable: 0`, `maxSurge: 1`, readiness gate, automatic rollback on
failed health checks.

---

## 7. Environments

| Env | Branch/tag | DB | Secrets |
|---|---|---|---|
| local | any | Docker | `.env` |
| development | `main` | dedicated | platform store |
| staging | `main` (auto) | anonymised copy | platform store |
| production | tag `v*` (manual approval) | production | platform store |

`NODE_ENV` is only `development` / `test` / `production`. `APP_ENV` carries the four-way
distinction. **Never branch business logic on the environment** — only configuration.

---

## 8. CI/CD

```yaml
name: deploy
on:
  push:
    tags: ['v*']

jobs:
  verify:
    uses: ./.github/workflows/ci.yml

  build-and-push:
    needs: verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ${{ vars.REGISTRY }}/api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  migrate-and-deploy:
    needs: build-and-push
    environment: production        # manual approval gate
    runs-on: ubuntu-latest
    steps:
      - run: npm run db:migrate
      - run: <deploy ${{ github.sha }}>
      - run: <smoke test /health and one real endpoint>
```

Rules: no deploy from a laptop; every deploy is reversible by redeploying the previous SHA;
production requires an approval; a smoke test runs after every deploy.

---

## 9. Operations

### Runbook (in `docs/runbook.md`, per project)

For each alert: what it means, how to confirm, how to mitigate, how to escalate.

### Alerts that must exist

| Alert | Threshold |
|---|---|
| 5xx rate | > 1% over 5 min |
| p95 latency | > 1 s over 10 min |
| `/ready` failing | any instance > 2 min |
| DB connection errors | any |
| Pool saturation | > 80% for 5 min |
| Disk / memory | > 85% |
| Unhandled exception restart | any |

### Incident response

1. Mitigate first (roll back, scale, disable the feature flag). Diagnose after.
2. Rollback is the default action, not the last resort.
3. Grab the `requestId` from the user report; it maps straight to the log line.
4. Blameless postmortem for anything customer-visible, with an action item that has an owner.

### Backups

Daily automated, encrypted, PITR enabled, retention per policy, and **a tested restore**
documented in the runbook. An untested backup is not a backup.

---

## 10. Checklist

- [ ] `npm run build && npm start` works from a clean `dist/`, with aliases resolved.
- [ ] Multi-stage Dockerfile, `npm ci`, non-root, tini, healthcheck, no secrets in layers.
- [ ] `.dockerignore` excludes `.env*`, `node_modules`, data dirs, logs.
- [ ] Migrations are backward-compatible and run before the rollout.
- [ ] Graceful shutdown wired; keep-alive timeouts exceed the LB's.
- [ ] `/health` is dependency-free; `/ready` checks the DB.
- [ ] Image tagged by git SHA; previous SHA redeployable.
- [ ] Production deploy gated by approval and followed by a smoke test.
- [ ] Alerts and runbook exist before launch.
- [ ] Backup restore has been tested at least once.
