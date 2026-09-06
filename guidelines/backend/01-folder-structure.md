# Backend — 01 Folder Structure

Express + TypeScript (ESM) + Postgres. **Layered**, not feature-sliced. The layer boundary is the
architecture; the folder tree makes it visible.

---

## 1. The tree

```
backend/
├── src/
│   ├── app.ts                      # composition root: middleware order, routers, bootstrap
│   ├── server.ts                   # listen() + graceful shutdown (split from app for testability)
│   │
│   ├── config/
│   │   ├── env.ts                  # THE only place process.env is read (Zod-validated)
│   │   └── constants.ts            # CACHE_TTL, PAGINATION, UPLOAD limits, etc.
│   │
│   ├── routes/                     # HTTP surface. Wiring only.
│   │   ├── articles.route.ts
│   │   ├── articles.route.test.ts
│   │   └── index.ts                # mounts every router onto one Router
│   │
│   ├── controllers/                # Use cases / orchestration. Framework-free.
│   │   ├── article.controller.ts
│   │   └── article.controller.test.ts
│   │
│   ├── repositories/               # Data access. SQL lives here and nowhere else.
│   │   ├── article.repository.ts
│   │   └── article.repository.test.ts
│   │
│   ├── services/                   # External side effects: email, storage, payments, push.
│   │   ├── email.service.ts
│   │   └── storage.service.ts
│   │
│   ├── models/                     # Row types + table names + DDL constants. No behaviour.
│   │   └── article.model.ts
│   │
│   ├── middleware/
│   │   ├── request-id.middleware.ts
│   │   ├── http-logger.middleware.ts
│   │   ├── auth.middleware.ts
│   │   ├── validate-request.middleware.ts
│   │   ├── cache.middleware.ts
│   │   ├── ratelimit.middleware.ts
│   │   ├── upload.middleware.ts
│   │   └── error.middleware.ts
│   │
│   ├── database/
│   │   ├── db.ts                   # pool + ping + graceful close
│   │   └── migrations/
│   │       ├── 001-create-authors.sql
│   │       └── 002-create-articles.sql
│   │
│   ├── types/                      # Cross-cutting types & enums. No imports from other layers.
│   │   ├── status.ts
│   │   ├── category.ts
│   │   ├── region.ts
│   │   ├── pagination.ts
│   │   ├── api.ts                  # envelope types
│   │   └── express.d.ts            # Request augmentation: id, user, validated
│   │
│   ├── utils/
│   │   ├── errors.ts               # RequestError + ERRORS registry
│   │   ├── response.ts             # successResponse / errorResponse
│   │   ├── pagination.ts           # toPage() — the ONLY place hasNext is computed
│   │   ├── logger.ts               # createLogger factory
│   │   ├── jwt.ts
│   │   └── password.ts
│   │
│   └── __tests__/
│       ├── integration/            # Testcontainers: real router + real Postgres
│       │   └── articles.test.ts
│       ├── factories/              # test data builders
│       └── helpers/                # container setup, auth token helpers
│
├── scripts/
│   ├── migrate.ts
│   ├── seed.ts
│   └── generate-error-docs.ts
│
├── docs/
│   ├── api.md                      # generated
│   ├── error-codes.md              # generated
│   └── schema.md                   # generated
│
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── jest.config.mjs
├── eslint.config.mjs
├── tsconfig.json
└── tsconfig.build.json
```

---

## 2. What belongs in each layer

| Layer | Owns | Must NOT contain |
|---|---|---|
| `routes/` | Path definitions, Zod `SCHEMA` const, middleware composition, `result.match()` termination | business logic, SQL, `try/catch` |
| `controllers/` | Use-case orchestration, authorisation decisions, cross-repository coordination, domain rules | `Request`/`Response`/`NextFunction`, SQL, HTTP status codes |
| `repositories/` | SQL, row→domain mapping, DB error → `ERRORS.DATABASE_ERROR` | HTTP concepts, business rules, other repositories' tables (join instead) |
| `services/` | Calls to external systems (SMTP, blob storage, third-party APIs) | SQL, HTTP request objects |
| `models/` | `interface X extends RowDataPacket`, `X_TABLE` const, `CREATE_X_TABLE` DDL | functions, imports from other layers |
| `middleware/` | Cross-cutting request concerns | business logic |
| `utils/` | Pure, dependency-free helpers | imports from routes/controllers/repositories |
| `types/` | Enums, shared types, module augmentation | runtime code other than enums |
| `config/` | Validated env + constants | anything else |

---

## 3. Dependency direction (enforced by ESLint)

```
routes ──▶ controllers ──▶ repositories ──▶ database
   │            │                │
   ▼            ▼                ▼
middleware   services         models
   │            │                │
   └────────────┴──── utils, types, config ◀────┘
```

Allowed: a layer imports the layer below, plus `utils`, `types`, `config`.
Forbidden: any upward import. `import/no-restricted-paths` zones in
[common/08-code-quality.md](../common/08-code-quality.md#3-eslint-configuration-baseline)
make this a build failure, not a review opinion.

---

## 4. File-per-domain rule

A domain (`article`, `author`, `admin`, `web-story`, `ad`, `tag`) gets **exactly one file per
layer**, named `<domain>.<layer>.ts`:

```
routes/articles.route.ts
controllers/article.controller.ts
repositories/article.repository.ts
models/article.model.ts
```

If a controller exceeds ~400 lines, split by use-case group into
`controllers/article/` with `article.read.controller.ts`, `article.write.controller.ts`,
`article.moderation.controller.ts`, plus an `index.ts` that re-exports. Do **not** split by
"helpers".

Tests are colocated: `article.controller.test.ts` sits next to `article.controller.ts`.
Integration tests are the exception — they live in `src/__tests__/integration/`.

---

## 5. `app.ts` vs `server.ts`

Split them. `app.ts` builds and returns the configured Express app with no side effects;
`server.ts` starts it. This is what makes `supertest` integration tests possible without
opening a port.

```ts
// src/app.ts
export function createApp(): Application {
  const app = express();
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(helmet());
  app.use(limiter);
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(httpLogger);

  app.get('/health', healthHandler);
  app.get('/ready', readyHandler);
  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);          // always last
  return app;
}
```

```ts
// src/server.ts
const logger = createLogger('@server');

async function main(): Promise<void> {
  await connectToDatabase();
  const server = createApp().listen(env.PORT, () => {
    logger.info('server started', { port: env.PORT, env: env.APP_ENV });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info('shutting down', { signal });
    server.close(async () => {
      await db.end();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void main();
```

> The reference `app.ts` calls `connectToDatabase()` *inside* the `listen` callback, so the
> server accepts traffic before the DB is verified. Connect first, then listen.

---

## 6. `routes/index.ts`

One place that knows every router. `app.ts` mounts a single `/api`.

```ts
const apiRouter = Router();
apiRouter.use('/articles', articleRouter);
apiRouter.use('/authors', authorRouter);
apiRouter.use('/admins', adminRouter);
apiRouter.use('/web-stories', webStoryRouter);
apiRouter.use('/ads', adRouter);
apiRouter.use('/tags', tagRouter);
apiRouter.use('/uploads', uploadRouter);
export default apiRouter;
```

---

## 7. Adding a new domain — the checklist

1. `models/<domain>.model.ts` — row interface, `<DOMAIN>_TABLE`, DDL constant.
2. `database/migrations/NNN-create-<domain>.sql`.
3. `repositories/<domain>.repository.ts` — `I<Domain>Repository` interface + `Impl` class + singleton export.
4. `controllers/<domain>.controller.ts` — one exported function per use case.
5. `routes/<domain>.route.ts` — `SCHEMA` const, middleware, `result.match()`.
6. Mount in `routes/index.ts`.
7. Error codes in `utils/errors.ts` under the domain's range.
8. Tests: `<domain>.repository.test.ts`, `<domain>.controller.test.ts`, `<domain>.route.test.ts`,
   `__tests__/integration/<domain>.test.ts`.
9. Regenerate `docs/api.md` and `docs/error-codes.md`.

---

## 8. Forbidden

- A new top-level folder under `src/` without a logged decision.
- `helpers/`, `common/`, `shared/`, `misc/`, `lib/` — these become junk drawers. Name the concern.
- `index.ts` barrels that re-export whole layers (breaks `import/no-cycle` and tree-shaking).
- Business logic in `app.ts`.
- A `database/db_data/` directory in the repo.
