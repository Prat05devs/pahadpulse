# 09 — Testing Strategy (cross-cutting)

The shared philosophy and the coverage bar. Layer-specific mechanics live in
`backend/08-testing.md`, `frontend/08-testing.md`, `mobile/08-testing.md`.

---

## 1. The pyramid we actually use

```
        ▲  E2E              ~5%    critical user journeys only
       ▲▲▲ Integration     ~25%    real DB / real router / real hook + MSW
    ▲▲▲▲▲▲ Unit            ~70%    pure logic, one module, everything else mocked
```

| Level | Backend | Web / Mobile |
|---|---|---|
| Unit | controller, repository (mocked `db`), utils, middleware | components (RTL), hooks (`renderHook`), pure utils |
| Integration | router + real Express + Testcontainers MySQL | component + real hook + MSW-mocked network |
| E2E | — (covered by web E2E) | Cypress (web) / Maestro or Detox (mobile) against a seeded stack |

---

## 2. Rules

| # | Rule |
|---|---|
| T1 | **Tests ship in the same PR as the code.** A PR with new logic and no tests is blocked. |
| T2 | **Test behaviour, not implementation.** Assert on outputs and observable effects, never on internal call order unless the call *is* the behaviour (e.g. "an email was sent"). |
| T3 | **Arrange / Act / Assert**, with those exact comments in non-trivial tests. |
| T4 | **One logical assertion per test.** Multiple `expect`s are fine if they describe one outcome. |
| T5 | Test names are sentences: `it('returns AUTHOR_NOT_FOUND when the author does not exist')`. |
| T6 | **Every error code a function can return has a test.** This is how the registry stays honest. |
| T7 | **No shared mutable state between tests.** `beforeEach` resets; `jest.clearAllMocks()` / `vi.clearAllMocks()` always. |
| T8 | **No network, no real clock, no randomness** in unit tests. Inject or fake them. |
| T9 | **Deterministic.** A flaky test is a broken test — fix or delete it the day it flakes. |
| T10 | Never test private helpers directly; test them through the public surface. |
| T11 | Fixtures come from a **factory with overrides**, never a hand-copied literal. |
| T12 | Snapshot tests only for stable serialised output (e.g. generated SQL). Never for React trees. |

---

## 3. Coverage bar

Enforced in CI on **changed files**, plus a global floor.

| Scope | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| Global floor | 70% | 65% | 70% | 70% |
| Controllers / repositories / services (backend) | 90% | 85% | 90% | 90% |
| Hooks & services (web/mobile) | 85% | 80% | 85% | 85% |
| Utils / error mapping | 95% | 90% | 95% | 95% |
| UI components | covered by Storybook stories + interaction tests, not a % target |

Excluded from coverage: `*.stories.tsx`, `src/test/**`, `src/types/**`, generated files,
`app.ts` bootstrap, config files.

Coverage is a floor, not a goal. 100% coverage of getters proves nothing; 90% of a controller
with every error branch exercised proves a lot.

---

## 4. Test data factories

One factory per entity, colocated with the test utilities.

```ts
// src/test/factories/article.ts
export const makeArticle = (overrides: Partial<Article> = {}): Article => ({
  id: 1,
  author_id: 1,
  title: 'Test Article Title',
  content: 'Test article content',
  category: Category.Culture,
  region: Region.Almora,
  image: { previewUrl: '/images/test.jpg' },
  status: Status.Approved,
  publish_date: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

export const makeArticles = (count: number): Article[] =>
  Array.from({ length: count }, (_, i) => makeArticle({ id: i + 1, title: `Test Article ${i + 1}` }));
```

Tests state only what they care about: `makeArticle({ status: Status.Pending })`.

---

## 5. Mocking policy

| Mock | Don't mock |
|---|---|
| The layer directly below the unit under test | The unit under test |
| Network (MSW on the client, Testcontainers on the server) | Your own pure functions |
| Clock, UUID, randomness | The type system (`as any` in tests is still banned) |
| Third-party SDKs (Cloudinary, SMTP, blob storage) | React itself |

Mock at the **module boundary you own**, using the same path alias the source uses:

```ts
jest.mock('@repositories/article.repository.ts', () => ({
  ArticleRepository: { getTrendingTags: jest.fn() },
}));
```

Never mock deep internals of a library. If a library is hard to mock, wrap it in a thin
service of ours and mock that.

---

## 6. What must be tested

**Always:**

- Every controller: happy path + every `err(...)` branch.
- Every repository method: success, empty result, DB throw → `DATABASE_ERROR`.
- Every route: 2xx shape, each mapped error status, auth-required returns 401, wrong-role returns 403.
- Every validation schema: one valid case, one case per rejection reason.
- Every custom hook: loading → success, loading → error, and cache-key correctness.
- Every component with conditional rendering: each branch.
- Auth flows, permission boundaries, ownership checks. Always.
- Pagination boundaries: first page, last page, empty, `hasNext` correctness.

**Never bother:**

- Framework behaviour (that `useState` works).
- Trivial getters/pass-throughs.
- Storybook stories rendering (the Storybook test runner already does this).
- Third-party library internals.

---

## 7. Naming & structure

```ts
describe('ArticleRepository', () => {
  describe('findById', () => {
    it('returns the article when it exists', async () => { /* AAA */ });
    it('returns ARTICLE_NOT_FOUND when no row matches', async () => {});
    it('returns DATABASE_ERROR when the query throws', async () => {});
  });
});
```

`describe` = the unit. Nested `describe` = the method or scenario group. `it` = a sentence
that completes "it ...".

Assert on the **code**, not the message — messages are copy and will change:

```ts
expect(result.isErr()).toBe(true);
if (result.isErr()) expect(result.error.code).toBe(ERRORS.ARTICLE_NOT_FOUND.code);
```

---

## 8. CI behaviour

- Unit + integration run on every push.
- Testcontainers-based integration tests run on PR (they need Docker); keep them under 5 min
  total by sharing one container per test file and `jest.setTimeout(30_000)`.
- E2E runs on PRs to `main` and on `main` after merge.
- Failing tests never get skipped to unblock a release. Revert instead.

---

## 9. Checklist

- [ ] Tests exist for every new function and every error branch.
- [ ] Test names read as sentences describing behaviour.
- [ ] AAA structure; mocks cleared in `beforeEach`.
- [ ] Fixtures come from factories.
- [ ] No real network, clock, or randomness in unit tests.
- [ ] Assertions target error **codes**, not messages.
- [ ] Coverage bar met for the changed files.
- [ ] No `.only`, no `.skip`, no commented-out tests in the diff.
