# Backend — 03 Low-Level Design

The exact shape of every file you will write. Copy these skeletons.

---

## 1. Model — `models/article.model.ts`

Row type, table name, DDL. No behaviour, no imports from other layers.

```ts
import type { RowDataPacket } from 'pg';

import { Category } from '@types/category.ts';
import { Region } from '@types/region.ts';
import { Status } from '@types/status.ts';

export const ARTICLES_TABLE = 'articles';

export interface Article extends RowDataPacket {
  id: number;
  author_id: number;
  title: string;
  content: string;
  category: Category;
  region: Region;
  image: string;
  status: Status;
  rejection_reason: string | null;
  publish_date: string | null;
  created_at: string;
  updated_at: string;
}

/** Row shape returned by the article + author join used by the public detail endpoint. */
export interface ArticleWithAuthor extends Article {
  author_name: string;
  author_email: string;
  author_profile_photo_url: string | null;
}
```

Keep `CREATE TABLE` DDL in `database/migrations/`, and export a `CREATE_ARTICLES_TABLE`
constant from the model **only** if integration tests need to build the table.

---

## 2. Repository — `repositories/article.repository.ts`

The only place SQL exists. Interface first, implementation second, singleton export last.

```ts
import type { ResultSetHeader } from 'pg';
import { err, ok, type Result } from 'neverthrow';

import { db } from '@database/db.ts';
import { type Article, ARTICLES_TABLE } from '@models/article.model.ts';
import { Status } from '@types/status.ts';
import { ERRORS, type RequestError } from '@utils/errors.ts';
import createLogger from '@utils/logger.ts';

const logger = createLogger('@article.repository');

export interface IArticleRepository {
  findById(id: number): Promise<Result<Article, RequestError>>;
  create(input: CreateArticleInput): Promise<Result<Article, RequestError>>;
  listApproved(cursor: number, limit: number): Promise<Result<Paginated<Article>, RequestError>>;
}

export interface CreateArticleInput {
  authorId: number;
  title: string;
  content: string;
  category: Category;
  region: Region;
  image: string;
  status: Status;
}

class ArticleRepositoryImpl implements IArticleRepository {
  async findById(id: number): Promise<Result<Article, RequestError>> {
    try {
      const [rows] = await db.query<Article[]>(
        `SELECT * FROM ${ARTICLES_TABLE} WHERE id = ?`,
        [id],
      );
      const article = rows[0];
      if (article === undefined) return err(ERRORS.ARTICLE_NOT_FOUND);
      return ok(article);
    } catch (error) {
      logger.error('findById failed', { id, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async create(input: CreateArticleInput): Promise<Result<Article, RequestError>> {
    try {
      const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO ${ARTICLES_TABLE}
           (author_id, title, content, category, region, image, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [input.authorId, input.title, input.content, input.category, input.region, input.image, input.status],
      );
      return await this.findById(result.insertId);
    } catch (error) {
      logger.error('create failed', { authorId: input.authorId, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }

  async listApproved(cursor: number, limit: number): Promise<Result<Paginated<Article>, RequestError>> {
    try {
      const [rows] = await db.query<Article[]>(
        `SELECT id, author_id, title, category, region, image, status,
                publish_date, created_at, updated_at
           FROM ${ARTICLES_TABLE}
          WHERE status = ?
            AND id < ?
          ORDER BY id DESC
          LIMIT ?`,
        [Status.Approved, cursor, limit + 1],   // one extra row -> hasNext, see 12-pagination.md
      );
      return ok(toPage(rows, limit));
    } catch (error) {
      logger.error('listApproved failed', { cursor, limit, error });
      return err(ERRORS.DATABASE_ERROR);
    }
  }
}

export const ArticleRepository: IArticleRepository = new ArticleRepositoryImpl();
```

### Repository rules

| # | Rule |
|---|---|
| RP1 | One repository per table-cluster (an aggregate), not per table. `article_tags` belongs to `ArticleRepository`. |
| RP2 | Interface `I<Domain>Repository` + `class <Domain>RepositoryImpl` + `export const <Domain>Repository`. The interface is what tests mock. |
| RP3 | Every method returns `Promise<Result<T, RequestError>>`. |
| RP4 | Every method has `try/catch`; the catch logs and returns `err(ERRORS.DATABASE_ERROR)`. Nothing else catches. |
| RP5 | **Never** interpolate a value into SQL. Identifiers come from constants or a whitelist. |
| RP6 | Explicit column lists on `SELECT` for list endpoints (don't ship `content` in a feed). `SELECT *` is acceptable only for single-row `findById`. |
| RP7 | Repositories never call other repositories. Cross-aggregate reads use a `JOIN`; cross-aggregate writes are orchestrated by the controller. |
| RP8 | No business rules. "Can this article be approved?" is a controller question. |
| RP9 | Multi-statement writes use a transaction (§6). |
| RP10 | Method inputs beyond 3 params take an input object (`CreateArticleInput`). |
| RP11 | List methods return `Paginated<T>` and end with `toPage(rows, limit)`. Cursor pagination only — see [12-pagination.md](12-pagination.md). |

> The reference `ArticleRepositoryImpl.update()` takes seven optional positional parameters and
> builds a dynamic `SET` clause. Use an input object and a whitelist-driven builder instead.

### Dynamic updates, safely

```ts
const UPDATABLE = ['title', 'content', 'category', 'region', 'image'] as const;
type UpdatableField = (typeof UPDATABLE)[number];

async update(id: number, patch: Partial<Record<UpdatableField, string>>): Promise<Result<Article, RequestError>> {
  const entries = UPDATABLE
    .filter((field) => patch[field] !== undefined)
    .map((field) => [field, patch[field]] as const);

  if (entries.length === 0) return this.findById(id);

  const setClause = entries.map(([field]) => `${field} = ?`).join(', ');
  const values = [...entries.map(([, value]) => value), id];
  // `setClause` is built only from the UPDATABLE literal union — never from user input.
  ...
}
```

---

## 3. Controller — `controllers/article.controller.ts`

One exported function per use case. **No Express types.**

```ts
import { err, ok, type Result } from 'neverthrow';

import { ArticleRepository } from '@repositories/article.repository.ts';
import { type Actor, Role } from '@types/actor.ts';
import { ERRORS, type RequestError } from '@utils/errors.ts';
import createLogger from '@utils/logger.ts';

const logger = createLogger('@article.controller');

export async function getApprovedArticleById(id: number): Promise<Result<Article, RequestError>> {
  return ArticleRepository.findApprovedById(id);
}

export async function updateArticle(
  actor: Actor,
  id: number,
  patch: ArticlePatch,
): Promise<Result<Article, RequestError>> {
  const existing = await ArticleRepository.findById(id);
  if (existing.isErr()) return err(existing.error);

  // Ownership check — belongs here, not in middleware: it needs DB state.
  if (existing.value.author_id !== actor.id && actor.role !== Role.Admin) {
    return err(ERRORS.ARTICLE_PERMISSION_DENIED);
  }

  // Domain rule: an approved article cannot be silently edited.
  if (existing.value.status === Status.Approved && actor.role !== Role.Admin) {
    return err(ERRORS.ARTICLE_STATUS_TRANSITION_NOT_ALLOWED);
  }

  const updated = await ArticleRepository.update(id, patch);
  if (updated.isErr()) return err(updated.error);

  logger.info('article updated', { articleId: id, actorId: actor.id });
  return ok(updated.value);
}
```

### Controller rules

| # | Rule |
|---|---|
| CT1 | Named exports, one per use case. No default export, no class. |
| CT2 | Never import `express`. Inputs are primitives/DTOs; output is a `Result`. |
| CT3 | The **actor** is always the first parameter for anything non-public. It comes from the JWT, never from the body. |
| CT4 | Ownership and state-machine rules live here. |
| CT5 | Propagate with `if (x.isErr()) return err(x.error)`. Never re-wrap. |
| CT6 | No `try/catch` — nothing here throws. |
| CT7 | `logger.info` for business-significant events only. |
| CT8 | Orchestrate multiple repositories/services here; if the write must be atomic, pass a transaction handle (§6). |

---

## 4. Route — `routes/articles.route.ts`

Wiring + schemas. No logic.

```ts
import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';

import { CACHE_TTL, PAGINATION } from '@config/constants.ts';
import { authenticate, requireRole } from '@middleware/auth.middleware.ts';
import { cacheMiddleware } from '@middleware/cache.middleware.ts';
import { validateRequest } from '@middleware/validate-request.middleware.ts';
import * as articleController from '@controllers/article.controller.ts';
import { Category } from '@types/category.ts';
import { Region } from '@types/region.ts';
import { Role } from '@types/actor.ts';
import { Status } from '@types/status.ts';
import { successResponse } from '@utils/response.ts';

const articleRouter = Router();

const SCHEMA = {
  ID_PARAM: z.object({ id: z.coerce.number().int().positive() }),
  LIST_QUERY: z.object({
    cursor: z.coerce.number().int().positive().default(Number.MAX_SAFE_INTEGER),
    limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  }),
  CREATE_BODY: z.object({
    title: z.string().min(1).max(255),
    content: z.string().min(1),
    category: z.enum(Category),
    region: z.enum(Region),
    image: z.url(),
    tags: z.array(z.string().min(1).max(100)).max(20).default([]),
    status: z.enum([Status.Draft, Status.Pending]).default(Status.Draft),
  }),
} as const;

articleRouter.get(
  '/approved/latest',
  cacheMiddleware(CACHE_TTL.LATEST_FEED),
  validateRequest({ query: SCHEMA.LIST_QUERY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { cursor, limit } = req.validated.query;
    const result = await articleController.listLatestApproved(cursor, limit);
    result.match(
      (data) => res.json(successResponse(data, 'Articles fetched successfully')),
      (error) => next(error),
    );
  },
);

articleRouter.post(
  '/',
  authenticate,
  requireRole(Role.Author, Role.Admin),
  validateRequest({ body: SCHEMA.CREATE_BODY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await articleController.createArticle(req.actor, req.validated.body);
    result.match(
      (data) => res.status(201).json(successResponse(data, 'Article created successfully')),
      (error) => next(error),
    );
  },
);

export default articleRouter;
```

### Route rules

| # | Rule |
|---|---|
| RT1 | Middleware order is fixed: `cache?` → `authenticate?` → `requireRole?` → `validateRequest` → handler. |
| RT2 | All schemas in one `SCHEMA` const at the top, `as const`, SCREAMING_SNAKE keys. |
| RT3 | The handler is 3–6 lines: read `req.validated`, call the controller, `match`. |
| RT4 | **Never** re-parse in the handler — `validateRequest` already produced `req.validated`. |
| RT5 | No `try/catch`, no `res.status(500)`, no error bodies. `next(error)` only. |
| RT6 | Register **specific paths before parameterised ones** (`/approved/latest` before `/:id`), or Express will match `/:id` first. |
| RT7 | `201` for create, `200` for everything else that returns a body. |
| RT8 | One router per domain, default-exported, mounted in `routes/index.ts`. |

---

## 5. Middleware

```ts
// middleware/auth.middleware.ts
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (header === undefined || !header.startsWith('Bearer ')) return next(ERRORS.NO_TOKEN_PROVIDED);

  const decoded = decodeAuthToken(header.slice('Bearer '.length));
  if (decoded.isErr()) return next(decoded.error);

  req.actor = decoded.value;
  return next();
};

export const requireRole =
  (...allowed: readonly Role[]): RequestHandler =>
  (req, _res, next) => {
    if (req.actor === undefined) return next(ERRORS.UNAUTHORIZED);
    if (!allowed.includes(req.actor.role)) return next(ERRORS.INSUFFICIENT_PERMISSIONS);
    return next();
  };
```

Rules: middleware **never throws** — it calls `next(ERRORS.X)` and returns. Factories that take
options return a `RequestHandler`. Request augmentation is declared once in
`types/express.d.ts`:

```ts
declare global {
  namespace Express {
    interface Request {
      id: string;
      actor?: Actor;
      validated: { params?: unknown; query?: unknown; body?: unknown };
    }
  }
}
```

(Type `validated` precisely per-route with a generic `validateRequest` if your project wants
full inference; otherwise cast once at the top of the handler.)

---

## 6. Transactions

Any use case that writes to more than one table is atomic.

```ts
// repositories/article.repository.ts
async createWithTags(input: CreateArticleInput, tags: readonly string[]): Promise<Result<Article, RequestError>> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [inserted] = await connection.query<ResultSetHeader>(
      `INSERT INTO ${ARTICLES_TABLE} (...) VALUES (...)`, [...],
    );
    await this.replaceTags(connection, inserted.insertId, tags);

    await connection.commit();
    return await this.findById(inserted.insertId);
  } catch (error) {
    await connection.rollback();
    logger.error('createWithTags failed', { authorId: input.authorId, error });
    return err(ERRORS.DATABASE_ERROR);
  } finally {
    connection.release();
  }
}
```

Rules: `release()` always in `finally`. Never `await` an external call (HTTP, SMTP) inside a
transaction. Keep transactions short. Helper methods that participate take the `connection` as
their first parameter.

---

## 7. Services — `services/email.service.ts`

```ts
const logger = createLogger('@email.service');

export interface IEmailService {
  sendOtp(to: string, otp: string): Promise<Result<void, RequestError>>;
}

class EmailServiceImpl implements IEmailService {
  private readonly transport = nodemailer.createTransport({ /* env */ });

  async sendOtp(to: string, otp: string): Promise<Result<void, RequestError>> {
    try {
      await this.transport.sendMail({
        from: env.FROM_EMAIL,
        to,
        subject: 'Your verification code',
        text: `Your code is ${otp}. It expires in 10 minutes.`,
      });
      logger.info('otp email sent', { to: maskEmail(to) });   // masked, never raw
      return ok(undefined);
    } catch (error) {
      logger.error('otp email failed', { to: maskEmail(to), error });
      return err(ERRORS.OTP_SEND_FAILED);
    }
  }
}

export const EmailService: IEmailService = new EmailServiceImpl();
```

Services wrap external systems, own their timeouts and retries, never log secrets, and return
`Result` like everything else. Transfers (upload/download) use an **idle** timeout, not a fixed
duration — see [10-performance-and-caching.md](10-performance-and-caching.md) §7.

---

## 8. Utilities

```ts
// utils/response.ts
export function successResponse<T>(payload: T | Paginated<T>, message = 'Operation successful') {
  if (isPaginated(payload)) {
    return { success: true as const, message, data: payload.data, pagination: payload.pagination, timestamp: new Date().toISOString() };
  }
  return { success: true as const, message, data: payload, timestamp: new Date().toISOString() };
}

export function errorResponse(message: string, code: number, requestId?: string) {
  return { success: false as const, error: { code, message }, requestId, timestamp: new Date().toISOString() };
}
```

---

## 9. Constants — `config/constants.ts`

Every magic number in the codebase lives here.

```ts
export const PAGINATION = { DEFAULT_LIMIT: 10, MAX_LIMIT: 100 } as const;
export const CACHE_TTL = {
  TRENDING_TAGS: 60 * 60,      // 1h
  TOP_ARTICLES: 30 * 60,       // 30m
  LATEST_FEED: 5 * 60,         // 5m
} as const;

export const UPLOAD = { MAX_BYTES: 5 * 1024 * 1024, ALLOWED_MIME: ['image/jpeg', 'image/png', 'image/webp'] } as const;

export const AUTH = { BCRYPT_ROUNDS: 12, OTP_TTL_SECONDS: 600, MIN_PASSWORD_LENGTH: 12 } as const;
```

---

## 10. LLD checklist

- [ ] Model has row interface + table constant, no behaviour.
- [ ] Repository: interface + impl + singleton; every method returns `Result`; every query parameterised.
- [ ] Controller: no Express import; actor first; ownership + state rules; no `try/catch`.
- [ ] Route: `SCHEMA` const; fixed middleware order; handler ≤ 6 lines; `req.validated` consumed; `match` termination.
- [ ] Specific routes registered before parameterised ones.
- [ ] Multi-table writes wrapped in a transaction with `release()` in `finally`.
- [ ] Every magic number in `config/constants.ts`.
- [ ] Every new failure has a registry code.
