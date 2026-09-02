# Frontend — 08 Testing

Vitest + Testing Library + MSW for unit/integration, Storybook for component states, Cypress
for critical journeys.

---

## 1. Test map

| Level | File | Under test | Network | Runtime |
|---|---|---|---|---|
| Unit — component | `x.test.tsx` | one component, props in / DOM out | none (props only) | ms |
| Unit — hook | `use-x.test.ts` | one hook via `renderHook` | MSW | ms |
| Unit — pure | `x.test.ts` | utils, schemas, formatters | none | ms |
| Integration | `x.integration.test.tsx` | component + real hook + real service | **MSW** | ms |
| Visual / interaction | `x.stories.tsx` | rendered states + `play()` | mocked via args | s |
| E2E | `cypress/e2e/*.cy.ts` | full journey, real browser | real or stubbed API | s |

---

## 2. Vitest configuration

```ts
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(dirname, './src') } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          setupFiles: ['./src/test/setup.tsx'],
          coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/**/*.stories.tsx', 'src/test/**', 'src/types/**', 'src/app/**/layout.tsx'],
            thresholds: { statements: 70, branches: 65, functions: 70, lines: 70 },
          },
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
        test: {
          name: 'storybook',
          browser: { enabled: true, headless: true, provider: 'playwright', instances: [{ browser: 'chromium' }] },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
});
```

The `resolve.alias` must mirror `tsconfig.json` `paths`.

---

## 3. Setup and custom render

```tsx
// src/test/setup.tsx
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { cleanup(); server.resetHandlers(); vi.clearAllMocks(); });
afterAll(() => server.close());
```

`onUnhandledRequest: 'error'` is important: any request the tests didn't intend fails loudly
instead of silently hanging.

```tsx
// src/test/utils.tsx
function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}

export * from '@testing-library/react';
export { customRender as render };
export { default as userEvent } from '@testing-library/user-event';
```

A **fresh QueryClient per test** with `retry: false` — a shared client leaks cache between
tests and retries turn a failing test into a slow failing test.

---

## 4. Query priority

Test what a user perceives. Query in this order:

1. `getByRole(role, { name })` ← **default choice**
2. `getByLabelText` (form fields)
3. `getByPlaceholderText`
4. `getByText`
5. `getByDisplayValue`
6. `getByTestId` ← **last resort**, only when nothing else identifies the element

A `getByRole` query is simultaneously a functional test and an accessibility test. If you
can't find an element by role, that is usually a real accessibility bug — fix the component,
don't add a `data-testid`.

`findBy*` for async, `queryBy*` only to assert absence, `getBy*` for present-now.

---

## 5. Component unit tests

```tsx
describe('ArticleCard', () => {
  it('renders the title and links to the article', () => {
    // Arrange
    const article = makeArticle({ id: 42, title: 'Kedarnath reopens' });

    // Act
    render(<ArticleCard article={article} />);

    // Assert
    expect(screen.getByRole('link', { name: /kedarnath reopens/i })).toHaveAttribute('href', '/articles/42');
  });

  it('calls onSelect with the article id when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ArticleCard article={makeArticle({ id: 42 })} onSelect={onSelect} />);

    await user.click(screen.getByRole('link'));

    expect(onSelect).toHaveBeenCalledWith(42);
  });

  it('renders a placeholder when there is no publish date', () => {
    render(<ArticleCard article={makeArticle({ publish_date: null })} />);
    expect(screen.getByText('Unpublished')).toBeInTheDocument();
  });
});
```

Test observable behaviour: rendered text, accessible roles, callbacks fired, attributes.
Never assert on internal state, class names, or component structure.

---

## 6. Hook tests

```ts
describe('useLatestArticles', () => {
  it('returns articles from the API', async () => {
    const { result } = renderHook(() => useLatestArticles(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(10);
  });

  it('surfaces a RequestError when the API fails', async () => {
    server.use(http.get('*/articles/approved/latest', () =>
      HttpResponse.json({ success: false, error: { code: 10001, message: 'Database operation failed' } }, { status: 500 })));

    const { result } = renderHook(() => useLatestArticles(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as RequestError).code).toBe(10001);
  });
});
```

Assert on `error.code`, never the message.

---

## 7. MSW handlers

```ts
// src/test/mocks/handlers.ts
const successEnvelope = <T,>(data: T) => ({
  success: true, message: 'Success', data, timestamp: new Date().toISOString(),
});

const paginatedEnvelope = <T,>(data: T[], hasNext = false, nextCursor = 0) => ({
  ...successEnvelope(data), pagination: { hasNext, nextCursor },
});

export const handlers = [
  http.get('*/articles/approved/latest', ({ request }) => {
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 10);
    return HttpResponse.json(paginatedEnvelope(makeArticles(limit), true, 90));
  }),
  http.get('*/tags/trending', () => HttpResponse.json(successEnvelope(['React', 'Uttarakhand']))),
];
```

**The mock envelope must match the real API envelope exactly.** If they drift, every test
passes and production breaks — which is precisely what happened in the reference repo, where
the client type says `{data, message, code}` and the server sends
`{success, message, data, timestamp}`.

Override per test with `server.use(...)`; `resetHandlers()` in `afterEach` undoes it.

---

## 8. Integration tests

Component + real hook + real service + MSW. This is the level that catches envelope
mismatches, wrong query keys, and bad Zod schemas.

```tsx
function TrendingTagsPage() {
  const { data } = useTrendingTags();
  return <TrendingTagsView trendingTags={data} />;
}

describe('TrendingTagsView (integration)', () => {
  it('renders tags returned by the API', async () => {
    server.use(http.get('*/tags/trending', () =>
      HttpResponse.json(successEnvelope(['React', 'Next.js']))));

    render(<TrendingTagsPage />);

    expect(await screen.findAllByText('#React')).not.toHaveLength(0);
  });

  it('falls back when the API fails', async () => {
    server.use(http.get('*/tags/trending', () =>
      HttpResponse.json({ success: false, error: { code: 10001, message: 'x' } }, { status: 500 })));

    render(<TrendingTagsPage />);

    expect(await screen.findAllByText('#Hill Farming')).not.toHaveLength(0);
  });
});
```

Write one integration test per feature slice: the happy path, the error path, and the empty path.

---

## 9. Storybook as a test

Every exported component has a story. Stories are rendered and smoke-tested by
`@storybook/addon-vitest`, and interaction-tested via `play()`.

```tsx
export const Loading: Story = { args: { isLoading: true } };
export const Empty: Story = { args: { articles: [] } };
export const Error: Story = { args: { error: new RequestError('Failed', 10001, 500) } };

export const SelectsOnClick: Story = {
  args: { article: makeArticle({ id: 7 }), onSelect: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('link'));
    await expect(args.onSelect).toHaveBeenCalledWith(7);
  },
};
```

Stories cover **visual states**; `.test.tsx` covers **logic**. Don't duplicate.

---

## 10. E2E (Cypress)

Only critical journeys. E2E is expensive and flaky by nature — keep the set small.

```
cypress/e2e/
  visitor-reads-article.cy.ts
  author-creates-and-submits-article.cy.ts
  admin-approves-article.cy.ts
  login-and-logout.cy.ts
```

```ts
describe('admin approves an article', () => {
  beforeEach(() => { cy.seedDatabase(); cy.loginAs('admin'); });

  it('moves a pending article to approved', () => {
    cy.visit('/admin/articles');
    cy.findByRole('row', { name: /pending headline/i }).findByRole('button', { name: /approve/i }).click();
    cy.findByRole('button', { name: /confirm/i }).click();
    cy.findByText(/status updated/i).should('be.visible');
    cy.findByRole('row', { name: /pending headline/i }).should('contain.text', 'Approved');
  });
});
```

Rules: `@testing-library/cypress` queries (`findByRole`), never CSS selector chains. Log in
through an API command, not by driving the login form (except in the login test). Seed
deterministic data before each spec. **Never `cy.wait(3000)`** — wait on an assertion.

---

## 11. What must be tested

- [ ] Every component with conditional rendering: each branch.
- [ ] Every component with a callback: the callback fires with the right arguments.
- [ ] Every list: loading, empty, error, populated.
- [ ] Every hook: success, error, and correct query key.
- [ ] Every form: each validation rule, submit success, server-error mapping, pending state.
- [ ] Every Zod schema: a valid payload and a rejected payload.
- [ ] Every permission-dependent UI: shown for the allowed role, hidden for others.
- [ ] The 4 critical journeys in E2E.

**Don't test:** that React re-renders, third-party internals, styling (that's Storybook +
Chromatic), or implementation details.

---

## 12. Checklist

- [ ] Fresh `QueryClient` per test, `retry: false`.
- [ ] MSW `onUnhandledRequest: 'error'`; handlers mirror the real envelope.
- [ ] `resetHandlers()` and `cleanup()` in `afterEach`.
- [ ] Queries by role/label; `data-testid` only as a last resort.
- [ ] `userEvent`, not `fireEvent`.
- [ ] Async assertions use `findBy*` / `waitFor`, never fixed sleeps.
- [ ] Fixtures from factories.
- [ ] Error assertions on `code`, not message.
- [ ] Story exists for every exported component, covering all states.
- [ ] No `.only`, no `.skip` in the diff.
