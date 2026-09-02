# Frontend — 05 State & Data Fetching

TanStack Query owns server state. Everything else is chosen by *who owns the truth*.

---

## 1. Decision table

| Question | State kind | Tool |
|---|---|---|
| Does the server own it? | server state | **TanStack Query** |
| Should it survive refresh / be shareable / work with the back button? | URL state | `useSearchParams`, route params |
| Is it a form field? | form state | React Hook Form + Zod |
| Is it used by one component? | local UI | `useState` / `useReducer` |
| Is it used by one subtree, and rarely changes? | shared UI | Context |
| Can it be computed from the above? | **derived** | compute during render / `useMemo` |

If you're reaching for a global store, re-read this table. In this stack the answer is almost
always TanStack Query or the URL.

---

## 2. Query client configuration

```ts
// lib/query-client.ts
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME.FEED,      // 5 min — never 0 by default
        gcTime: 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) =>
          isRequestError(error) && error.statusCode >= 500 && failureCount < 2,
      },
      mutations: { retry: false },
    },
  });
}
```

```tsx
// app/provider.tsx
'use client';

export default function Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);   // stable across renders
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

`useState(makeQueryClient)` — not `new QueryClient()` in the component body, which would
create a fresh client on every render and throw the cache away.

**Never retry a 4xx.** Retrying a 401 or 403 three times is three guaranteed failures and a
worse rate-limit posture.

---

## 3. Query keys

Always from the feature's factory (see
[03-low-level-design.md](03-low-level-design.md#4-query-keys--featuresarticlequeriests)).

Rules:

1. Hierarchical: `['articles'] → ['articles','list'] → ['articles','list','tag','x']`.
2. Every parameter that changes the result is in the key. A missing param means stale data
   from a different query.
3. Keys are serialisable and stable — never an object literal that changes identity, never a
   `Date`.
4. Invalidate at the right level: `articleKeys.lists()` for feeds, `articleKeys.detail(id)`
   for one item, `articleKeys.all` rarely.

> Bare keys like `['topNews']` (as in the reference) can't express hierarchy, so invalidation
> becomes "invalidate everything" or "hope".

---

## 4. Stale time — pick deliberately

| Data | `staleTime` |
|---|---|
| Real-time-ish (notifications) | 0 |
| Feeds, lists | 5 min |
| Detail pages | 10 min |
| Trending tags, taxonomy | 1 hour |
| Truly static (categories, regions) | `Infinity` |

`staleTime: 0` on everything means a refetch on every mount — a common cause of "why is the
app so chatty". Constants live in `config/constants.ts`.

---

## 5. Mutations

```ts
export function useUpdateArticleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, reason }: UpdateStatusInput) => updateArticleStatus(id, status, reason),

    onSuccess: (article) => {
      queryClient.setQueryData(articleKeys.detail(article.id), article);   // seed
      queryClient.invalidateQueries({ queryKey: articleKeys.lists() });    // refresh lists
      toast.success('Status updated');
    },

    onError: (error) => toast.error(messageForError(error)),
  });
}
```

| # | Rule |
|---|---|
| M1 | One mutation hook per operation, named `use<Verb><Noun>`. |
| M2 | `onSuccess` invalidates the affected keys and, when the response contains the entity, seeds the detail cache. |
| M3 | `onError` maps `error.code` to a message. **Never** `error.message.includes(...)`. |
| M4 | `retry: false` for mutations unless the endpoint is idempotent. |
| M5 | Use `isPending` to disable the submit button; never track it in a separate `useState`. |
| M6 | Optimistic updates only where latency is genuinely felt, and always with a rollback. |

```ts
// optimistic, with rollback
onMutate: async ({ id, status }) => {
  await queryClient.cancelQueries({ queryKey: articleKeys.detail(id) });
  const previous = queryClient.getQueryData(articleKeys.detail(id));
  queryClient.setQueryData(articleKeys.detail(id), (old) => old && { ...old, status });
  return { previous };
},
onError: (_err, { id }, context) => {
  if (context?.previous) queryClient.setQueryData(articleKeys.detail(id), context.previous);
},
onSettled: (_d, _e, { id }) => queryClient.invalidateQueries({ queryKey: articleKeys.detail(id) }),
```

> The reference's `useCreateArticle` keeps a separate `useState` for `isCreating` alongside
> the mutation. Use `isPending`; two sources of truth for one fact always drift.

---

## 6. Pagination

Cursor-based, matching the API.

```ts
export function useInfiniteArticlesByTag(tag: string) {
  return useInfiniteQuery({
    queryKey: articleKeys.byTag(tag),
    queryFn: ({ pageParam }) => fetchArticlesByTag(tag, pageParam, PAGE_SIZE.FEED),
    initialPageParam: Number.MAX_SAFE_INTEGER,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.nextCursor : undefined,
    staleTime: STALE_TIME.FEED,
  });
}
```

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteArticlesByTag(tag);
const articles = data?.pages.flatMap((page) => page.data) ?? [];
```

Never simulate infinite scroll by refetching with a growing `limit`.

---

## 7. URL state

Filters, sorting, search, and the active tab belong in the URL.

```tsx
'use client';

export function useArticleFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = {
    category: (searchParams.get('category') as Category | null) ?? undefined,
    region: (searchParams.get('region') as Region | null) ?? undefined,
    search: searchParams.get('search') ?? '',
  };

  const setFilter = useCallback(
    (key: string, value: string | undefined) => {
      const next = new URLSearchParams(searchParams);
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return { filters, setFilter };
}
```

Then feed `filters` straight into the query key — the URL becomes the single source of truth,
and back/forward, refresh, and link-sharing all work for free.

Debounce search input with `useDebouncedValue` before it enters the key.

---

## 8. Server-side prefetching

For SEO-relevant routes, fetch on the server and hydrate.

```tsx
// app/(public)/tags/[tag]/page.tsx  — Server Component
export default async function TagPage({ params }: PageProps) {
  const { tag } = await params;
  const queryClient = makeQueryClient();

  await queryClient.prefetchQuery({
    queryKey: articleKeys.byTag(tag),
    queryFn: () => fetchArticlesByTag(tag, Number.MAX_SAFE_INTEGER, PAGE_SIZE.FEED),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ArticlesByTagSection tag={tag} />
    </HydrationBoundary>
  );
}
```

The client hook uses the **same key**, finds the hydrated data, and doesn't refetch. HTML for
crawlers, cache for interaction, one data model.

Prefetch independent queries with `Promise.all` — sequential awaits on the server are
sequential latency for the user.

---

## 9. Auth state

- Session lives in a Context (`features/auth/hooks/use-auth.tsx`), exposing
  `{ user, isLoading, login, logout }`.
- Access token in memory; refresh token in an httpOnly cookie.
- On a 401, the API client attempts a single refresh, retries once, and on failure clears the
  session and redirects to login.
- `queryClient.clear()` on logout — otherwise the next user sees the previous user's cache.
- Route protection is server-side (middleware + layout check). Client-side guards are UX only.

> Storing tokens in `localStorage` (as the reference does) exposes them to any XSS. New
> projects use the cookie + in-memory pattern.

---

## 10. Anti-patterns

| Anti-pattern | Instead |
|---|---|
| `useEffect` + `fetch` + `useState` | `useQuery` |
| `useState` mirroring server data | read from the query cache |
| `useEffect` to derive state | compute during render / `useMemo` |
| Separate `isLoading` state next to a mutation | `isPending` |
| Inline query keys | key factory |
| `staleTime: 0` everywhere | deliberate per-data staleness |
| Retrying 4xx | `retry` predicate on `statusCode >= 500` |
| Filters in `useState` | filters in the URL |
| Global store for server data | TanStack Query |
| `queryClient.setQueryData` used as a store | mutations + invalidation |
| `error.message.includes('...')` | switch on `error.code` |
| Not clearing the cache on logout | `queryClient.clear()` |

---

## 11. Checklist

- [ ] All server data through TanStack Query; zero `fetch` in components.
- [ ] Keys from the factory; every varying param in the key.
- [ ] `staleTime` chosen deliberately from constants.
- [ ] `retry` never applies to 4xx.
- [ ] Mutations invalidate/seed correctly; `isPending` drives the UI.
- [ ] Pagination uses `useInfiniteQuery` with `getNextPageParam`.
- [ ] Filters and search live in the URL.
- [ ] SEO routes prefetch on the server and hydrate with the same key.
- [ ] Cache cleared on logout.
- [ ] No `useEffect` deriving state.
