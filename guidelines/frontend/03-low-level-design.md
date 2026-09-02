# Frontend — 03 Low-Level Design

Exact file skeletons. Copy these.

---

## 1. Feature types — `features/article/types.ts`

Zod first, types inferred. This file is the domain contract.

```ts
import { z } from 'zod';

import { Category, Region, Status } from '@/types/common';

export const ArticleSchema = z.object({
  id: z.number(),
  author_id: z.number(),
  title: z.string(),
  category: z.enum(Category),
  region: z.enum(Region),
  image: z.string(),
  status: z.enum(Status),
  publish_date: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Article = z.infer<typeof ArticleSchema>;

export const ArticleDetailSchema = ArticleSchema.extend({
  content: z.string(),
  tags: z.array(z.string()),
  author_name: z.string(),
  author_profile_photo_url: z.string().nullable(),
});
export type ArticleDetail = z.infer<typeof ArticleDetailSchema>;

export const CreateArticleInputSchema = ArticleSchema
  .pick({ title: true, category: true, region: true })
  .extend({
    content: z.string().min(1, 'Content is required'),
    image: z.url('A cover image is required'),
    tags: z.array(z.string().min(1)).max(20),
  });
export type CreateArticleInput = z.infer<typeof CreateArticleInputSchema>;
```

Rules: never `.strict()` (the API may add fields); compose with `.extend()`/`.pick()`/`.omit()`
rather than duplicating; keep server-shaped `snake_case` field names — a mapping layer nobody
maintains is worse than a mixed convention.

---

## 2. API client — `lib/api.ts`

Transport only. Knows nothing about any domain.

```ts
import { env } from '@/config/env';
import { ErrorEnvelopeSchema } from '@/types/api';

export class RequestError extends Error {
  constructor(message: string, readonly code: number, readonly statusCode: number) {
    super(message);
    this.name = 'RequestError';
  }
}

export function isRequestError(e: unknown): e is RequestError {
  return e instanceof RequestError;
}

async function request(endpoint: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': crypto.randomUUID(),
        ...getAuthHeader(),
        ...init.headers,
      },
    });
  } catch {
    // Only genuine transport failures land here.
    throw new RequestError('Network unavailable', ERROR_CODES.NETWORK_ERROR, 0);
  }

  const raw: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = ErrorEnvelopeSchema.safeParse(raw);
    throw parsed.success
      ? new RequestError(parsed.data.error.message, parsed.data.error.code, response.status)
      : new RequestError('Request failed', ERROR_CODES.UNHANDLED_ERROR, response.status);
  }
  return raw;
}

export const apiClient = {
  get:    (endpoint: string) => request(endpoint),
  post:   (endpoint: string, body: unknown) => request(endpoint, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (endpoint: string, body: unknown) => request(endpoint, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (endpoint: string, body: unknown) => request(endpoint, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (endpoint: string) => request(endpoint, { method: 'DELETE' }),
};
```

**Critical:** do **not** wrap the whole function in `try/catch` and rethrow a generic error —
that destroys the server's `code` and `statusCode`. Catch only around `fetch` itself.

`request` returns `unknown`. Parsing is the **service's** job, so the transport layer never
needs a generic that lies.

---

## 3. Feature service — `features/article/services/index.ts`

One function per endpoint. Builds the URL, calls `apiClient`, parses with Zod.

```ts
import { apiClient } from '@/lib/api';
import { paginatedEnvelope, successEnvelope } from '@/types/api';
import { type Paginated } from '@/types/common';

import { type Article, ArticleSchema, type ArticleDetail, ArticleDetailSchema } from '../types';

export async function fetchLatestArticles(cursor: number, limit: number): Promise<Paginated<Article>> {
  const raw = await apiClient.get(`/articles/approved/latest?cursor=${cursor}&limit=${limit}`);
  const { data, pagination } = paginatedEnvelope(ArticleSchema).parse(raw);
  return { data, pagination };
}

export async function fetchArticleById(id: number): Promise<ArticleDetail> {
  const raw = await apiClient.get(`/articles/approved/${id}`);
  return successEnvelope(ArticleDetailSchema).parse(raw).data;
}

export async function createArticle(input: CreateArticleInput): Promise<Article> {
  const raw = await apiClient.post('/articles', input);
  return successEnvelope(ArticleSchema).parse(raw).data;
}
```

Rules: no React, no hooks, no toasts. Throws `RequestError`. Parses the **whole envelope**,
not individual items. Build query strings with `URLSearchParams` when there are optional
params. Never `any`.

---

## 4. Query keys — `features/article/queries.ts`

A key factory. Bare string keys make invalidation guesswork.

```ts
export const articleKeys = {
  all: ['articles'] as const,
  lists: () => [...articleKeys.all, 'list'] as const,
  latest: () => [...articleKeys.lists(), 'latest'] as const,
  top: () => [...articleKeys.lists(), 'top'] as const,
  byCategory: (category: Category) => [...articleKeys.lists(), 'category', category] as const,
  byTag: (tag: string) => [...articleKeys.lists(), 'tag', tag] as const,
  mine: () => [...articleKeys.lists(), 'mine'] as const,
  details: () => [...articleKeys.all, 'detail'] as const,
  detail: (id: number) => [...articleKeys.details(), id] as const,
};
```

Now `invalidateQueries({ queryKey: articleKeys.lists() })` invalidates every list and no detail.
Hierarchical keys are the whole point.

---

## 5. Hooks — `features/article/hooks/index.ts`

The public surface for pages. Wraps TanStack Query; renders nothing.

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { STALE_TIME } from '@/config/constants';

import { articleKeys } from '../queries';
import { createArticle, fetchArticleById, fetchLatestArticles } from '../services';

export function useLatestArticles(limit = PAGE_SIZE.FEED) {
  return useQuery({
    queryKey: articleKeys.latest(),
    queryFn: () => fetchLatestArticles(Number.MAX_SAFE_INTEGER, limit),
    staleTime: STALE_TIME.FEED,
  });
}

export function useArticle(id: number) {
  return useQuery({
    queryKey: articleKeys.detail(id),
    queryFn: () => fetchArticleById(id),
    staleTime: STALE_TIME.DETAIL,
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateArticleInput) => createArticle(input),
    onSuccess: (article) => {
      queryClient.invalidateQueries({ queryKey: articleKeys.lists() });
      queryClient.setQueryData(articleKeys.detail(article.id), article);
      toast.success('Article created');
    },
    onError: (error) => toast.error(messageForError(error)),
  });
}
```

Rules:

| # | Rule |
|---|---|
| H1 | **Return the query object.** Don't destructure into `{ data, isLoading }` — callers lose `refetch`, `isFetching`, `error`, and the types stay accurate. |
| H2 | Key from the factory, never an inline array. |
| H3 | `staleTime` from `config/constants.ts`, never an inline number. |
| H4 | Guard with `enabled` rather than calling the hook conditionally. |
| H5 | Mutations invalidate **and/or** seed the cache in `onSuccess`. |
| H6 | Hooks never render JSX. |
| H7 | Pagination uses `useInfiniteQuery` with `getNextPageParam` from the `pagination` object. |

```ts
export function useInfiniteArticlesByTag(tag: string) {
  return useInfiniteQuery({
    queryKey: articleKeys.byTag(tag),
    queryFn: ({ pageParam }) => fetchArticlesByTag(tag, pageParam, PAGE_SIZE.FEED),
    initialPageParam: Number.MAX_SAFE_INTEGER,
    getNextPageParam: (last) => (last.pagination.hasNext ? last.pagination.nextCursor : undefined),
    staleTime: STALE_TIME.FEED,
  });
}
```

---

## 6. Components

### Presentational (the default)

```tsx
interface ArticleCardProps {
  article: Article;
  variant?: 'vertical' | 'horizontal';
  onSelect?: (id: number) => void;
  className?: string;
}

export function ArticleCard({ article, variant = 'vertical', onSelect, className }: ArticleCardProps) {
  return (
    <article className={cn('group flex gap-4', variant === 'vertical' && 'flex-col', className)}>
      <Image src={article.image} alt="" width={400} height={225} className="rounded-md object-cover" />
      <div>
        <CategoryBadge category={article.category} />
        <h3 className="mt-2 line-clamp-2 text-lg font-semibold">
          <Link href={`/articles/${article.id}`} onClick={() => onSelect?.(article.id)}>
            {article.title}
          </Link>
        </h3>
        <time dateTime={article.publish_date ?? undefined} className="text-muted-foreground text-sm">
          {formatDate(article.publish_date)}
        </time>
      </div>
    </article>
  );
}
```

Rules: named export; props interface named `<Component>Props` declared directly above; no
`React.FC`; `className` last and merged with `cn()`; no data fetching; no default export.

### Container (feature section)

The only component type allowed to call hooks that fetch.

```tsx
'use client';

export function LatestArticlesSection() {
  const { data, isLoading, error, refetch } = useLatestArticles();

  if (isLoading) return <ArticleListSkeleton count={4} />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (data.data.length === 0) return <EmptyState message="No articles yet" />;

  return <ArticleList articles={data.data} />;
}
```

**Every async surface renders all four states.**

---

## 7. Custom hooks (non-query)

```ts
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
```

Rules: one job; always clean up (timers, listeners, subscriptions); explicit return type;
generic when it doesn't care about the shape; shared hooks live in `src/hooks/`,
feature-specific ones in the feature.

**Never `useEffect` to derive state:**

```tsx
// ❌ extra render, stale risk
const [full, setFull] = useState('');
useEffect(() => setFull(`${first} ${last}`), [first, last]);

// ✅
const full = `${first} ${last}`;
```

`useEffect` is for synchronising with something *outside* React: timers, event listeners,
browser APIs, imperative library instances. Not for computing values.

---

## 8. Constants — `config/constants.ts`

```ts
export const STALE_TIME = {
  FEED: 5 * 60 * 1000,
  DETAIL: 10 * 60 * 1000,
  TRENDING_TAGS: 60 * 60 * 1000,
  STATIC: Infinity,
} as const;

export const PAGE_SIZE = { FEED: 10, TABLE: 20, GRID: 12 } as const;

export const ROUTES = {
  home: '/',
  article: (id: number) => `/articles/${id}`,
  tag: (tag: string) => `/tags/${encodeURIComponent(tag)}`,
  adminArticles: '/admin/articles',
} as const;
```

Never build a URL with a template literal at the call site — use `ROUTES`. When a path
changes, you change it once.

---

## 9. LLD checklist

- [ ] Zod schema written first; type inferred; no `.strict()`.
- [ ] Service parses the whole envelope; throws `RequestError`; no React import.
- [ ] Query keys come from the factory; `staleTime` from constants.
- [ ] Hook returns the query object; never renders.
- [ ] Only container components call fetching hooks.
- [ ] Loading, error, empty, success all rendered.
- [ ] Presentational components take props and callbacks only.
- [ ] `useEffect` used only for external synchronisation, with cleanup.
- [ ] Named exports; `<Component>Props` interface; `cn()` for `className`.
- [ ] URLs from `ROUTES`; numbers from `constants`.
