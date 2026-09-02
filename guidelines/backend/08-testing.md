# Backend — 08 Testing

Jest (ESM) + supertest + Testcontainers. Three levels, each with a fixed shape.

---

## 1. Test map

| Level | File | Under test | Mocked | Runtime |
|---|---|---|---|---|
| Repository unit | `repositories/x.repository.test.ts` | SQL construction + Result mapping | `db` | ms |
| Controller unit | `controllers/x.controller.test.ts` | business rules | repositories, services | ms |
| Route unit | `routes/x.route.test.ts` | wiring, validation, status mapping | controllers, cache | ms |
| Integration | `__tests__/integration/x.test.ts` | router → controller → repository → **real MySQL** | nothing (except 3rd-party services) | seconds |

Every domain has all four.

---

## 2. Jest configuration

```js
// jest.config.mjs
const config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.json' }] },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@config/(.*)$':       '<rootDir>/src/config/$1',
    '^@controllers/(.*)$':  '<rootDir>/src/controllers/$1',
    '^@database/(.*)$':     '<rootDir>/src/database/$1',
    '^@middleware/(.*)$':   '<rootDir>/src/middleware/$1',
    '^@models/(.*)$':       '<rootDir>/src/models/$1',
    '^@repositories/(.*)$': '<rootDir>/src/repositories/$1',
    '^@routes/(.*)$':       '<rootDir>/src/routes/$1',
    '^@services/(.*)$':     '<rootDir>/src/services/$1',
    '^@types/(.*)$':        '<rootDir>/src/types/$1',
    '^@utils/(.*)$':        '<rootDir>/src/utils/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/helpers/setup.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/types/**', '!src/server.ts'],
  coverageThreshold: {
    global: { statements: 70, branches: 65, functions: 70, lines: 70 },
    './src/controllers/':  { statements: 90, branches: 85, functions: 90, lines: 90 },
    './src/repositories/': { statements: 90, branches: 85, functions: 90, lines: 90 },
    './src/utils/':        { statements: 95, branches: 90, functions: 95, lines: 95 },
  },
};
export default config;
```

The `moduleNameMapper` must mirror `tsconfig.json` `paths` **exactly**. A missing alias
produces a confusing "cannot find module" only in tests.

---

## 3. Repository unit tests

Mock the pool, assert on the SQL and the `Result`.

```ts
jest.unstable_mockModule('@database/db.ts', () => ({ db: { query: jest.fn() } }));

const { db } = await import('@database/db.ts');
const { ArticleRepository } = await import('@repositories/article.repository.ts');

const mockQuery = db.query as jest.Mock;

describe('ArticleRepository', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('findById', () => {
    it('returns the article when a row exists', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce([[makeArticleRow({ id: 1 })]]);

      // Act
      const result = await ArticleRepository.findById(1);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value.id).toBe(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE id = ?'), [1]);
    });

    it('returns ARTICLE_NOT_FOUND when no row matches', async () => {
      mockQuery.mockResolvedValueOnce([[]]);
      const result = await ArticleRepository.findById(999);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) expect(result.error.code).toBe(ERRORS.ARTICLE_NOT_FOUND.code);
    });

    it('returns DATABASE_ERROR when the driver throws', async () => {
      mockQuery.mockRejectedValueOnce(new Error('ECONNRESET'));
      const result = await ArticleRepository.findById(1);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) expect(result.error.code).toBe(ERRORS.DATABASE_ERROR.code);
    });
  });
});
```

**Always assert that the value was passed as a parameter, not interpolated:**

```ts
expect(mockQuery).toHaveBeenCalledWith(expect.not.stringContaining("'"), [1]);
```

That single assertion is a standing regression test against SQL injection.

Also test: `affectedRows === 0` → NOT_FOUND, `limit + 1` fetch and `hasNext` correctness,
and that transactions call `rollback()` and `release()` on failure.

---

## 4. Controller unit tests

Mock the repository at the module boundary. Test business rules and every error branch.

```ts
jest.mock('@repositories/article.repository.ts', () => ({
  ArticleRepository: { findById: jest.fn(), update: jest.fn() },
}));

import { ArticleRepository } from '@repositories/article.repository.ts';
import { updateArticle } from '@controllers/article.controller.ts';

const repo = ArticleRepository as jest.Mocked<typeof ArticleRepository>;

describe('updateArticle', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns ARTICLE_PERMISSION_DENIED when the actor is not the owner', async () => {
    // Arrange
    repo.findById.mockResolvedValue(ok(makeArticle({ author_id: 7 })));
    const actor = makeActor({ id: 9, role: Role.Author });

    // Act
    const result = await updateArticle(actor, 1, { title: 'x' });

    // Assert
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe(ERRORS.ARTICLE_PERMISSION_DENIED.code);
    expect(repo.update).not.toHaveBeenCalled();     // the write must not have happened
  });

  it('allows an admin to update any article', async () => {
    repo.findById.mockResolvedValue(ok(makeArticle({ author_id: 7 })));
    repo.update.mockResolvedValue(ok(makeArticle({ title: 'new' })));

    const result = await updateArticle(makeActor({ id: 1, role: Role.Admin }), 1, { title: 'new' });

    expect(result.isOk()).toBe(true);
  });

  it('propagates the repository error unchanged', async () => {
    repo.findById.mockResolvedValue(err(ERRORS.DATABASE_ERROR));
    const result = await updateArticle(makeActor(), 1, {});
    if (result.isErr()) expect(result.error.code).toBe(ERRORS.DATABASE_ERROR.code);
  });
});
```

`expect(repo.update).not.toHaveBeenCalled()` on the denial path is essential — it proves the
permission check actually short-circuits the write.

---

## 5. Route unit tests

Mount the router on a bare Express app with the real `errorHandler`. Mock the controller.
This tests validation, status mapping, and the envelope — not business logic.

```ts
jest.mock('@controllers/article.controller.ts', () => ({ getApprovedArticle: jest.fn() }));
jest.mock('@middleware/cache.middleware.ts', () => ({ cacheMiddleware: () => (_r, _s, n) => n() }));

const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.id = 'test-request-id'; next(); });
app.use('/articles', articleRouter);
app.use(errorHandler);

describe('GET /articles/:id', () => {
  it('returns 200 with the success envelope', async () => {
    mockGetArticle.mockResolvedValue(ok(makeArticle({ id: 1 })));

    const res = await request(app).get('/articles/1').expect(200);

    expect(res.body).toMatchObject({ success: true, message: expect.any(String), data: { id: 1 } });
    expect(res.body.timestamp).toBeDefined();
  });

  it('returns 400 when the id is not a positive integer', async () => {
    const res = await request(app).get('/articles/abc').expect(400);
    expect(res.body.error.code).toBe(ERRORS.INVALID_PARAMS.code);
    expect(mockGetArticle).not.toHaveBeenCalled();
  });

  it('maps ARTICLE_NOT_FOUND to 404', async () => {
    mockGetArticle.mockResolvedValue(err(ERRORS.ARTICLE_NOT_FOUND));
    const res = await request(app).get('/articles/999').expect(404);
    expect(res.body.error.code).toBe(ERRORS.ARTICLE_NOT_FOUND.code);
  });
});
```

Every protected route must have `401 without a token` and `403 with the wrong role` tests.
Every route with a body must have a rejection test per validation rule.

---

## 6. Integration tests (Testcontainers)

Real MySQL, real router, real repository. This is what proves the SQL actually works.

```ts
// src/__tests__/integration/articles.test.ts
jest.setTimeout(60_000);

let container: StartedMySqlContainer;
let pool: Pool;
let app: Application;

jest.unstable_mockModule('@database/db.ts', () => ({ get db() { return pool; } }));

beforeAll(async () => {
  container = await new MySqlContainer('mysql:8.4')
    .withDatabase('test_db').withUsername('test').withUserPassword('test')
    .start();

  pool = mysql.createPool({
    host: container.getHost(),
    port: container.getMappedPort(3306),
    user: 'test', password: 'test', database: 'test_db',
    timezone: 'Z', dateStrings: true,
  });

  await runMigrations(pool);     // the SAME migration files as production
  app = createApp();
});

afterAll(async () => {
  await pool.end();
  await container.stop();
});

beforeEach(async () => { await truncateAll(pool); await seedFixtures(pool); });
```

**Rules:**

| # | Rule |
|---|---|
| I1 | Run the **real migration files**. Hand-written `CREATE TABLE` in the test lets schema drift go undetected — this is the single biggest value of integration tests. |
| I2 | One container per test **file**, started in `beforeAll`. Never one per test. |
| I3 | `beforeEach` truncates and reseeds. Tests never depend on each other's data. |
| I4 | Name the files `*.test.ts` so the default pattern picks them up. |
| I5 | Test what unit tests can't: real SQL, FK constraints, transactions/rollback, cursor pagination across pages, `ON DUPLICATE KEY`, `FULLTEXT` search, enum coercion. |
| I6 | Mock only genuinely external services (SMTP, blob storage), never our own layers. |
| I7 | Pin the image tag (`mysql:8.4`), never `latest` — `latest` makes CI non-reproducible. |
| I8 | `jest.setTimeout(60_000)` at the top of the file. |

What every integration suite must cover: create → read round trip, list pagination
(first page, next page, last page, `hasNext`), auth 401/403, FK violation → mapped error,
transaction rollback leaves no partial rows, and unique-constraint violation → `DUPLICATE_RESOURCE`.

---

## 7. Test helpers

```
src/__tests__/
  factories/
    article.ts        makeArticle / makeArticleRow / makeArticles
    actor.ts          makeActor({ id, role })
  helpers/
    setup.ts          global beforeEach: jest.clearAllMocks()
    container.ts      startMySql(), runMigrations(), truncateAll()
    auth.ts           authHeaderFor(actor) -> 'Bearer <signed token>'
```

Factories return complete valid objects; tests override only what they're testing.

---

## 8. What must be tested

- [ ] Every repository method: ok, empty, throw.
- [ ] Every controller function: happy path + **every** `err(...)` branch.
- [ ] Every route: 2xx envelope, each mapped error status, 401, 403, each validation rejection.
- [ ] Every state transition: allowed and disallowed.
- [ ] Every permission boundary, including "not the owner".
- [ ] Pagination edges.
- [ ] Every registry error code the module can produce.
- [ ] Transactions: rollback on failure.
- [ ] Cache middleware: not used with `Authorization`; not caching non-2xx.

---

## 9. Rules of thumb

- Assert on **error codes**, never messages.
- `jest.clearAllMocks()` in a global `beforeEach`.
- No `.only`, no `.skip`, no commented-out tests in a merged PR.
- No real network, no real clock (`jest.useFakeTimers()`), no `Math.random`.
- A flaky test is fixed or deleted the day it flakes.
- Test names read as sentences describing behaviour, not implementation.
