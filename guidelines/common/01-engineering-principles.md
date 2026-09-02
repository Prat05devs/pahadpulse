# 01 — Engineering Principles

These are the "why" behind every other rule. When a guideline doesn't cover your case,
decide by applying these in order.

---

## P1. Boring, uniform, predictable

We optimise for *the second engineer*, not the first. A pattern that is 10% worse but used
everywhere beats a pattern that is 10% better but used in one place.

**Consequence:** if a solved problem already has a shape in this codebase (pagination,
error handling, data fetching), you copy that shape. You do not improve it in a feature PR.
Improvements are their own PR, with the reasoning logged in the module doc.

## P2. Errors are values

A function that can fail returns its failure in its type signature. Exceptions are for
*programmer errors* and *truly exceptional* conditions, not for control flow.

```ts
// bad — the caller cannot see that this can fail
async function findArticle(id: number): Promise<Article> { ... }

// good — failure is in the type
async function findById(id: number): Promise<Result<Article, RequestError>> { ... }
```

See [04-error-model.md](04-error-model.md).

## P3. Parse, don't validate

At every boundary, transform untyped input into a typed domain value **once**, with Zod.
After the boundary, the type system is trusted and there are no defensive checks.

```ts
// boundary
const query = SCHEMA.GET_PAGINATED_ARTICLES.parse(req.query); // { cursor: number; limit: number }
// after this line, `query.cursor` is a number. Never re-check it.
```

Boundaries are: HTTP request in, HTTP response consumed, env vars, `localStorage`/`AsyncStorage`,
deep links, file uploads, third-party webhooks.

## P4. Layers have one direction

```
route -> controller -> repository -> database
```

A layer may only import from the layer directly below it. A repository never knows what an
HTTP request is. A route never writes SQL. Violations are architectural bugs, not style issues.

Frontend equivalent:

```
page/screen -> feature component -> feature hook -> feature service -> apiClient
```

## P5. Make the illegal state unrepresentable

Prefer enums, discriminated unions, and branded types over `string` + runtime checks.

```ts
// bad
status: string

// good
export enum Status { Draft = 'draft', Pending = 'pending', Approved = 'approved', Rejected = 'rejected' }
status: Status
```

## P6. Colocate by feature, not by file type

A feature owns its components, hooks, services, and types. Deleting a feature should mean
deleting one folder. Shared code is promoted *out* of a feature only when a second feature
actually needs it — never speculatively.

## P7. No speculative abstraction

Do not build a helper, wrapper, base class, or generic for one call site. The rule of three:
duplicate twice, abstract on the third.

## P8. Explicit over implicit

- No barrel files that re-export everything (`export * from './x'`), except a feature's own
  `hooks/index.ts` and `services/index.ts`, which are the feature's public surface.
- No implicit globals. No module side effects other than in `app.ts` / `layout.tsx`.
- No magic numbers. `cacheMiddleware(1800)` becomes `cacheMiddleware(CACHE_TTL.TOP_ARTICLES)`.

## P9. Observability is part of the feature

A feature is not done when it works. It is done when you can tell, from logs alone, that it
worked, and why it failed. Every error path logs with enough context to reproduce.

## P10. Security is a default, not a step

Parameterised queries only. Auth on the server, never only in the UI. Secrets from env only.
Least-privilege tokens. See [07-security.md](07-security.md).

## P11. Delete code

Dead code, commented-out code, unused exports, and `TODO` without a ticket reference are all
review blockers. Git remembers; the file does not need to.

## P12. Write down what the code can't say

Business rules, state machines, and non-obvious constraints live in the module's doc under
`project/modules/`. If you implement a rule that isn't written there, write it there in the
same PR.

---

## Decision checklist

Before you write a new file, ask:

- [ ] Does this shape already exist somewhere in the repo? (Then copy it.)
- [ ] Which layer does this belong to? Am I importing downward only?
- [ ] What are the failure modes, and are they in the return type?
- [ ] What is the boundary, and where is the Zod schema for it?
- [ ] Is there a business rule here that belongs in the module's doc?
- [ ] What test proves it works, and what test proves it fails correctly?
