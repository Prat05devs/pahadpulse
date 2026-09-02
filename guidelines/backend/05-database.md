# Backend — 05 Database

MySQL 8, `mysql2/promise`, raw parameterised SQL, forward-only numbered migrations. No ORM.

---

## 1. Connection pool

```ts
// src/database/db.ts
import mysql from 'mysql2/promise';

import { env } from '@config/env.ts';
import createLogger from '@utils/logger.ts';

const logger = createLogger('@database');

export const db = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  connectionLimit: env.DB_POOL_LIMIT,   // default 20
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  timezone: 'Z',                        // always store and read UTC
  dateStrings: true,                    // return DATETIME as string; app converts explicitly
  namedPlaceholders: false,
  multipleStatements: false,            // never enable — SQL-injection amplifier
});

export async function connectToDatabase(): Promise<void> {
  const connection = await db.getConnection();
  try {
    await connection.ping();
    logger.info('database connected', { database: env.DB_NAME, env: env.APP_ENV });
  } finally {
    connection.release();
  }
}

export async function closeDatabase(): Promise<void> {
  await db.end();
}
```

**Sizing:** `connectionLimit × replicas` must stay well under MySQL's `max_connections`.
20 per instance is a sane default; 50 (as in the reference) will exhaust a small managed
instance at three replicas.

**`multipleStatements: false`** is mandatory. **`timezone: 'Z'`** is mandatory — mixed
timezones are the most expensive bug class in this stack.

Startup: `connectToDatabase()` runs **before** `listen()`. Failure exits non-zero.
Shutdown: `closeDatabase()` on SIGTERM, after the HTTP server drains.

---

## 2. Schema conventions

See [common/03-naming-and-conventions.md](../common/03-naming-and-conventions.md#4-database-naming-mysql)
for names. Additional structural rules:

| # | Rule |
|---|---|
| D1 | Every table has `id INT AUTO_INCREMENT PRIMARY KEY` (or a composite PK for join tables). |
| D2 | Every table has `created_at` and, if mutable, `updated_at`, both `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` (`updated_at` adds `ON UPDATE CURRENT_TIMESTAMP`). |
| D3 | **Foreign keys are declared**, with explicit `ON DELETE` / `ON UPDATE`. |
| D4 | `NOT NULL` by default. Nullable requires a reason — "unknown" is a reason, "not filled in yet" usually isn't. |
| D5 | `utf8mb4` / `utf8mb4_0900_ai_ci` everywhere. Never `utf8` (3-byte, breaks emoji). |
| D6 | `ENUM` values must match the TypeScript enum exactly, character for character. |
| D7 | Money is `DECIMAL(12,2)`. Never `FLOAT`/`DOUBLE`. |
| D8 | Booleans are `BOOLEAN NOT NULL DEFAULT` (TINYINT(1)) named `is_*`. |
| D9 | Text sizes are deliberate: `VARCHAR(n)` for bounded, `TEXT` for prose, `LONGTEXT` only for article bodies. |
| D10 | Store URLs as `VARCHAR(2048)`, not `VARCHAR(255)`. |

```sql
CREATE TABLE articles (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  author_id        INT NOT NULL,
  title            VARCHAR(255) NOT NULL,
  content          LONGTEXT NOT NULL,
  category         VARCHAR(100) NOT NULL,
  region           VARCHAR(100) NOT NULL,
  image            VARCHAR(2048) NOT NULL,
  status           ENUM('draft','pending','approved','rejected') NOT NULL DEFAULT 'draft',
  rejection_reason TEXT NULL,
  publish_date     DATETIME NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_articles_author
    FOREIGN KEY (author_id) REFERENCES authors(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  INDEX idx_status_id      (status, id),
  INDEX idx_status_pubdate (status, publish_date),
  INDEX idx_category_id    (category, id),
  INDEX idx_region_id      (region, id),
  INDEX idx_author_id      (author_id, id),
  FULLTEXT INDEX idx_search (title, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

Note the **composite** indexes ending in `id`: they serve both the filter and the
`WHERE id < ? ORDER BY id DESC` cursor in one index. Single-column `idx_status` (as in the
reference) forces a filesort on every paginated feed.

---

## 3. Migrations

```
src/database/migrations/
  001-create-authors.sql
  002-create-admins.sql
  003-create-articles.sql
  004-create-tags.sql
  005-create-article-tags.sql
  014-add-articles-slug.sql
```

| # | Rule |
|---|---|
| M1 | Numbered, zero-padded, forward-only. Never edit a merged migration — add a new one. |
| M2 | One logical change per file. |
| M3 | Idempotent where possible (`CREATE TABLE IF NOT EXISTS`, guarded `ALTER`). |
| M4 | Applied by `npm run db:migrate`, which records applied filenames in a `schema_migrations` table. Never by hand on a live DB. |
| M5 | Every migration has a documented rollback (a `-- DOWN` section or a paired `NNN-down.sql`). |
| M6 | Data backfills are separate from schema changes, and are batched (`LIMIT 1000` loops), not one giant `UPDATE`. |
| M7 | Expand → migrate → contract for breaking changes: add the new column, dual-write, backfill, switch reads, drop the old column in a later release. Never in one deploy. |
| M8 | Adding an index to a large table uses `ALGORITHM=INPLACE, LOCK=NONE`, and is reviewed for lock impact. |
| M9 | Seeds (`db:seed`) are for local/dev only, are idempotent, and contain **no real user data**. |

> Do not keep `01-tables.sql` + `02-data.sql` as the schema source of truth. They cannot express
> evolution, and the reference copy contains a syntax error that has never been caught because
> nothing runs it in CI. Migrations run in CI on every PR.

---

## 4. Query rules

| # | Rule |
|---|---|
| Q1 | **Always parameterised.** `db.query(sql, [values])`. No exceptions. |
| Q2 | Explicit column lists on list queries. Never ship `LONGTEXT content` in a feed. |
| Q3 | Every query that can return many rows has a `LIMIT`. |
| Q4 | No `SELECT *` except single-row `findById`. |
| Q5 | No N+1: fetch related rows with a `JOIN` or a single `WHERE id IN (?)` batch. |
| Q6 | `WHERE` columns must be index-covered. Run `EXPLAIN` on any new query touching > 10k rows and paste the output in the PR. |
| Q7 | Avoid functions on indexed columns (`WHERE DATE(created_at) = ?` kills the index) — use a range. |
| Q8 | `ORDER BY` always includes `id` as the final tiebreaker. |
| Q9 | Prefer `EXISTS` over `COUNT(*) > 0`. |
| Q10 | Long strings of `OR` become `IN`. |
| Q11 | Type the result: `db.query<Article[]>(...)` / `db.query<ResultSetHeader>(...)`. |

### The N+1 fix

```ts
// bad — one query per article
for (const article of articles) {
  article.tags = await TagRepository.findByArticleId(article.id);
}

// good — one query for all
const ids = articles.map((a) => a.id);
const [rows] = await db.query<TagRow[]>(
  `SELECT at.article_id, t.name
     FROM article_tags at
     JOIN tags t ON t.id = at.tag_id
    WHERE at.article_id IN (?)`,
  [ids],
);
const byArticle = Map.groupBy(rows, (r) => r.article_id);
```

---

## 5. Transactions

Use one whenever a use case writes to more than one table, or performs read-then-write on the
same row.

```ts
const connection = await db.getConnection();
try {
  await connection.beginTransaction();
  // ... writes via `connection`, never `db`
  await connection.commit();
} catch (error) {
  await connection.rollback();
  logger.error('tx failed', { operation: 'createWithTags', error });
  return err(ERRORS.DATABASE_ERROR);
} finally {
  connection.release();   // always
}
```

Rules: `release()` in `finally`, always. No network I/O inside a transaction. Keep them under
a few hundred milliseconds. Acquire locks in a consistent order across the codebase to avoid
deadlocks. Handle `ER_LOCK_DEADLOCK` with a single bounded retry.

Read-modify-write on a counter must not be two statements — use one:

```sql
INSERT INTO article_views (article_id, views) VALUES (?, 1)
ON DUPLICATE KEY UPDATE views = views + 1;
```

---

## 6. Time and timezone

- Store UTC. `timezone: 'Z'` in the pool.
- `dateStrings: true` so the driver returns `'2026-09-02 10:00:00'` and the app converts
  deliberately, rather than a `Date` in the server's local zone.
- API responses use ISO-8601 UTC with `Z`.
- Never `new Date()` inside business logic — pass the timestamp in, so it can be tested.

---

## 7. Soft deletes

Default is a **hard delete** with `ON DELETE RESTRICT` on referencing rows.

Soft delete only when the module genuinely needs an audit trail or restore. Then:

- Column `deleted_at DATETIME NULL` (not `is_deleted`).
- **Every** query must filter `deleted_at IS NULL`. Enforce it by exposing only repository
  methods that already include the filter — never a generic `findAll`.
- Unique constraints must include `deleted_at`, or a re-created record collides.

The reference's `StatusAuthor { Active = '1', Deleted = '0' }` mapped onto `is_active` conflates
"deactivated" with "deleted". Keep them separate columns with separate meanings.

---

## 8. Performance

| Symptom | Fix |
|---|---|
| Slow feed query | Composite index `(filter_col, id)` |
| Filesort in `EXPLAIN` | Ordering column not in the index |
| `Using temporary` | `GROUP BY` on a non-indexed expression |
| High connection count | Lower `connectionLimit`; look for leaked connections (missing `release()`) |
| Slow count | Don't count. Use cursor pagination and `hasNext` — [12-pagination.md](12-pagination.md). |
| Slow search | `FULLTEXT` with `MATCH ... AGAINST`, not `LIKE '%x%'` |

Enable the slow query log in non-prod; review anything over 100 ms. Add a `durationMs` debug
log around queries in development.

---

## 9. Backups & data safety

- Automated daily backups with point-in-time recovery, encrypted at rest.
- **Restore is tested** at least once per project, and the runbook is in `docs/`.
- The application DB user has DML on its own schema only — no `GRANT ALL`, no `root`.
- Production data is never copied to a laptop. Staging uses anonymised data.
- Destructive migrations are reviewed by two people.

---

## 10. Checklist

- [ ] Every query parameterised; `multipleStatements: false`.
- [ ] Composite indexes support both the filter and the cursor order.
- [ ] `EXPLAIN` output attached for any new query on a large table.
- [ ] FKs declared with explicit `ON DELETE`.
- [ ] Migration is numbered, forward-only, reversible, and runs in CI.
- [ ] Multi-table writes are transactional; `release()` in `finally`.
- [ ] UTC everywhere; `timezone: 'Z'`, `dateStrings: true`.
- [ ] No `SELECT *` on list endpoints; no N+1.
- [ ] Pool size appropriate for replica count.
- [ ] `database/db_data/` is not in the repo.
