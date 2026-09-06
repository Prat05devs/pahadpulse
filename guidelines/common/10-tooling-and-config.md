# 10 — Tooling & Repository Configuration

Every BasicTech repo has the same files in the same places with the same scripts. If a repo
differs, it's a bug.

---

## 1. Required root files

| File | Purpose |
|---|---|
| `CLAUDE.md` | Agent entry point (project-specific, links to `guidelines/`) |
| `README.md` | Human onboarding: what, how to run, how to test, how to deploy |
| `package.json` | Standard scripts + `volta` pin |
| `package-lock.json` | Committed. Exactly one lockfile per repo. |
| `.nvmrc` | Node version, matches `volta` |
| `tsconfig.json` | Per [02-typescript-language-rules.md](02-typescript-language-rules.md) |
| `eslint.config.mjs` | Flat config, per [08-code-quality.md](08-code-quality.md) |
| `.prettierrc` | The shared config. Exactly one Prettier config file. |
| `.editorconfig` | LF, UTF-8, 2 spaces, trim trailing whitespace, final newline |
| `.gitignore` | Per [07-security.md](07-security.md#10-things-that-must-never-be-committed) |
| `.env.example` | Every key the app reads, no values |
| `commitlint.config.js` | Conventional Commits |
| `.github/workflows/ci.yml` | The pipeline from `08-code-quality.md` §6 |
| `.github/pull_request_template.md` | The PR template |
| `docker-compose.yml` | Local dependencies (DB, mail catcher) — never the app's secrets |
| `Dockerfile` | Multi-stage production image (backend) |

Plus, per layer: `jest.config.mjs` (backend), `vitest.config.ts` + `.storybook/` +
`cypress.config.ts` (web), `app.json`/`app.config.ts` + `eas.json` (mobile).

---

## 2. Standard npm scripts

Identical names in every repo. Tools differ; names never do.

```jsonc
{
  "scripts": {
    "dev":           "<per layer>",
    "build":         "<per layer>",
    "start":         "<per layer>",

    "typecheck":     "tsc --noEmit",
    "lint":          "eslint . --max-warnings=0",
    "lint:fix":      "eslint . --fix",
    "format":        "prettier --write .",
    "format:check":  "prettier --check .",

    "test":          "<jest|vitest>",
    "test:watch":    "<jest|vitest> --watch",
    "test:coverage": "<jest|vitest> --coverage",
    "test:integration": "<runner> --testPathPatterns=integration",

    "db:migrate":    "node scripts/migrate.js",     // backend
    "db:seed":       "node scripts/seed.js",        // backend

    "storybook":     "storybook dev -p 6006",       // web
    "e2e":           "start-server-and-test dev http://localhost:3001 'cypress run --e2e'",

    "verify":        "npm run typecheck && npm run lint && npm run format:check && npm test",
    "prepare":       "husky"
  }
}
```

`npm run verify` is what you run before opening a PR, and what CI runs.

> The backend reference has `"lint": "eslint --ext .ts ./src"` — the `--ext` flag is removed in
> ESLint 9 flat config. Use `eslint . --max-warnings=0`.

---

## 3. Node & package manager

- Node **22 LTS**, pinned in both `.nvmrc` and `volta`.
- npm only. If both `package-lock.json` and `yarn.lock` exist, delete `yarn.lock` — two
  lockfiles means two dependency trees and irreproducible builds. (Both reference repos have
  this problem.)
- `npm ci` in CI and in Docker builds. Never `npm install` in a Dockerfile.

---

## 4. Editor configuration

Commit `.vscode/extensions.json` (recommendations only) and `.vscode/settings.json` with:

```jsonc
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.eol": "\n"
}
```

Recommended extensions: ESLint, Prettier, Tailwind CSS IntelliSense, Error Lens, Vitest/Jest.

---

## 5. Docker

**Local dev** (`docker-compose.yml`): database, mail catcher, object-storage emulator.
The app itself normally runs on the host for fast reload. Named volumes for data — **never**
a bind-mounted `./database/db_data` that ends up in git.

```yaml
services:
  db:
    image: postgres:8.4
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
    ports: ['3306:3306']
    volumes:
      - db_data:/var/lib/postgres                 # named volume, not a bind mount
      - ./src/database:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost']
      interval: 5s
      retries: 10
volumes:
  db_data:
```

**Production image** — multi-stage, non-root, no dev dependencies, no source:

```dockerfile
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
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/app.js"]
```

> The reference `Dockerfile` runs `npm install` (not `ci`), copies the whole source, runs as
> root, and starts with `npm run dev`. That is a dev image labelled as production. Use the
> multi-stage form above.

`.dockerignore` must contain: `node_modules`, `.git`, `.env*`, `dist`, `coverage`,
`database/db_data`, `*.log`, `.next`.

---

## 6. CI/CD (GitHub Actions)

```yaml
name: ci
on:
  pull_request:
  push: { branches: [main] }

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'npm' }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check
      - run: npm test -- --coverage
      - run: npm run build
      - run: npm audit --omit=dev --audit-level=high
```

Rules:

- CI is the single source of truth for "green". Never merge on a local pass.
- Secrets come from GitHub Environments, scoped per environment.
- Deploys are tag-triggered or `main`-triggered, never manual from a laptop.
- Every deploy is reversible: image tags are immutable, previous tag is redeployable.

---

## 7. Environments

| Env | Purpose | Data |
|---|---|---|
| `local` | Developer machine | Docker DB, seeded |
| `development` | Shared integration | Synthetic |
| `staging` | Pre-prod, mirrors prod config | Anonymised |
| `production` | Live | Real |

`NODE_ENV` is only ever `development`, `test`, or `production`. A separate `APP_ENV` carries
the four-way distinction if needed. Never branch business logic on the environment; branch
configuration only.
