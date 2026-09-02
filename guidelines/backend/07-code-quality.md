# Backend — 07 Code Quality

Backend-specific rules on top of [common/08-code-quality.md](../common/08-code-quality.md).

---

## 1. Layer discipline (the rule that matters most)

Machine-enforced via `import/no-restricted-paths`:

```js
'import/no-restricted-paths': ['error', {
  zones: [
    { target: './src/repositories', from: './src/routes' },
    { target: './src/repositories', from: './src/controllers' },
    { target: './src/repositories', from: './src/middleware' },
    { target: './src/controllers',  from: './src/routes' },
    { target: './src/controllers',  from: './src/middleware' },
    { target: './src/services',     from: './src/routes' },
    { target: './src/models',       from: './src/repositories' },
    { target: './src/utils',        from: './src/routes' },
    { target: './src/utils',        from: './src/controllers' },
    { target: './src/utils',        from: './src/repositories' },
    { target: './src/types',        from: './src' },
  ],
}],
```

Plus a hard ban on Express types leaking into controllers:

```js
{
  files: ['src/controllers/**/*.ts', 'src/repositories/**/*.ts', 'src/services/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [{ name: 'express', message: 'Controllers/repositories/services must not know about HTTP.' }],
    }],
  },
}
```

If either rule fires, the design is wrong — do not add an exception.

---

## 2. Additional ESLint rules for the backend

```js
rules: {
  'no-restricted-properties': ['error', {
    object: 'process', property: 'env',
    message: 'Import from @config/env.ts',
  }],
  '@typescript-eslint/no-floating-promises': 'error',   // an unawaited db call is a silent bug
  '@typescript-eslint/no-misused-promises': 'error',    // async handler passed where void expected
  '@typescript-eslint/require-await': 'error',
  '@typescript-eslint/switch-exhaustiveness-check': 'error',
  'no-console': 'error',
  'security/detect-object-injection': 'off',            // too noisy; rely on whitelists
}
```

`no-floating-promises` catches the most expensive backend mistake there is: a write that was
never awaited and silently didn't happen.

---

## 3. What good looks like, per layer

### Repository

```ts
// ✅
async findById(id: number): Promise<Result<Article, RequestError>> {
  try {
    const [rows] = await db.query<Article[]>(`SELECT * FROM ${ARTICLES_TABLE} WHERE id = ?`, [id]);
    const article = rows[0];
    if (article === undefined) return err(ERRORS.ARTICLE_NOT_FOUND);
    return ok(article);
  } catch (error) {
    logger.error('findById failed', { id, error });
    return err(ERRORS.DATABASE_ERROR);
  }
}
```

```ts
// ❌ every line is a violation
async findById(id: any) {                                  // any
  const [rows] = await db.query(`SELECT * FROM articles WHERE id = ${id}`);   // injection, untyped
  if (!rows.length) throw new Error('not found');          // throws, ad-hoc error
  return rows[0];                                          // no Result
}
```

### Controller

```ts
// ❌ knows about HTTP, knows about SQL, throws
export async function getArticle(req: Request, res: Response) {
  const [rows] = await db.query(`SELECT * FROM articles WHERE id = ${req.params.id}`);
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  res.json(rows[0]);
}

// ✅ pure use case
export async function getApprovedArticle(id: number): Promise<Result<Article, RequestError>> {
  return ArticleRepository.findApprovedById(id);
}
```

### Route

```ts
// ❌ logic in the route, re-parsing, manual error response
articleRouter.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'bad id' });
    const result = await getArticle(id);
    if (result.isErr()) return res.status(500).json({ error: result.error.message });
    res.json({ data: result.value });
  } catch (e) { res.status(500).send(e.message); }
});

// ✅
articleRouter.get(
  '/:id',
  validateRequest({ params: SCHEMA.ID_PARAM }),
  async (req, res, next) => {
    const result = await articleController.getApprovedArticle(req.validated.params.id);
    result.match(
      (data) => res.json(successResponse(data, 'Article fetched successfully')),
      (error) => next(error),
    );
  },
);
```

---

## 4. Backend-specific anti-patterns (blocking)

| Anti-pattern | Why it's blocking |
|---|---|
| Template-literal SQL with a value | SQL injection |
| `express` imported in a controller/repository | layer violation |
| `throw` in a controller or repository | breaks the `Result` contract |
| `try/catch` outside repository/service/bootstrap | someone is throwing who shouldn't |
| Missing `await` on a DB call | `no-floating-promises`; silent data loss |
| Missing `connection.release()` in `finally` | pool exhaustion, then total outage |
| `SELECT *` on a list endpoint | ships `LONGTEXT` over the wire |
| Query inside a loop | N+1 |
| `COUNT(*)` for pagination | full scan on every page |
| `LIMIT ? OFFSET ?` | drifts under concurrent writes; scans linearly. Use a cursor — `12-pagination.md` |
| `hasNext: rows.length === limit` | wrong on an exactly-full last page. Use `limit + 1` |
| `res.status(...).json(...)` for an error in a handler | bypasses the error middleware |
| A new error created inline instead of from `ERRORS` | unroutable, undocumented failure |
| `process.env` outside `config/env.ts` | untyped, unvalidated config |
| Caching an authenticated response | cross-user data leak |
| `authorId` read from the request body | IDOR |
| Business logic in middleware | wrong layer, untestable |
| Repository calling another repository | hidden coupling; use a JOIN or orchestrate in the controller |
| `new Date()` in a controller | untestable |
| Numbers inline (`cacheMiddleware(1800)`) | belongs in `config/constants.ts` |

---

## 5. Function and file sizing

| Item | Limit |
|---|---|
| Repository method | 40 lines |
| Controller function | 50 lines |
| Route handler body | 6 lines |
| Middleware | 30 lines |
| Repository file | 500 lines (then split the aggregate) |
| Router file | exempt (it's a list), but ≤ 25 endpoints |

A controller function longer than 50 lines is usually two use cases. Split it.

---

## 6. TypeScript specifics for MySQL

```ts
// Always type the query result
const [rows]   = await db.query<Article[]>(sql, params);          // SELECT
const [result] = await db.query<ResultSetHeader>(sql, params);    // INSERT/UPDATE/DELETE

// Row interfaces extend RowDataPacket so the generic is accepted
export interface Article extends RowDataPacket { ... }

// Index access is `T | undefined` under noUncheckedIndexedAccess — handle it
const article = rows[0];
if (article === undefined) return err(ERRORS.ARTICLE_NOT_FOUND);
```

Check `result.affectedRows` on updates and `result.insertId` on inserts. An `UPDATE` that
matched nothing is usually a `NOT_FOUND`, not a success:

```ts
if (result.affectedRows === 0) return err(ERRORS.ARTICLE_NOT_FOUND);
```

---

## 7. Build configuration

`tsconfig.json` is for the editor and typecheck (`noEmit: true`).
`tsconfig.build.json` is for the artefact:

```jsonc
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "outDir": "dist",
    "sourceMap": true,
    "declaration": false
  },
  "exclude": ["node_modules", "dist", "**/*.test.ts", "src/__tests__/**"]
}
```

```jsonc
"scripts": {
  "typecheck": "tsc --noEmit",
  "build": "tsc -p tsconfig.build.json && tsc-alias -p tsconfig.build.json",
  "start": "node dist/server.js",
  "dev": "tsx watch src/server.ts"
}
```

`tsc-alias` (or `tsconfig-paths`) is required because TypeScript does **not** rewrite path
aliases in emitted JS. Without it, `@utils/logger` fails at runtime in production — a class of
bug that only appears after deploy.

---

## 8. Review checklist (backend)

- [ ] No upward imports; no `express` in controller/repository/service.
- [ ] Every SQL statement parameterised; identifiers from whitelists.
- [ ] Every fallible function returns `Result`; no `throw` across layers.
- [ ] `try/catch` only where a library throws; each logs once and converts.
- [ ] Every `await` present; no floating promises.
- [ ] `connection.release()` in `finally` for every `getConnection()`.
- [ ] Actor from token; ownership verified against the DB.
- [ ] `req.validated` consumed; no re-parsing.
- [ ] Error responses only from `errorHandler`.
- [ ] Constants in `config/constants.ts`; config from `config/env.ts`.
- [ ] Tests cover happy path + every error branch.
- [ ] `npm run verify` green.
