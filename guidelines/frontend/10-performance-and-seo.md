# Frontend — 10 Performance & SEO

For a content site these are the same subject: what a crawler sees and what a user sees on a
3G phone are both determined by how much work happens on the server versus the client.

---

## 1. Budgets

| Metric | Target | Hard fail |
|---|---|---|
| LCP | < 2.0 s | > 2.5 s |
| INP | < 200 ms | > 500 ms |
| CLS | < 0.05 | > 0.1 |
| TTFB | < 400 ms | > 800 ms |
| First-load JS (route) | < 150 KB gzip | > 250 KB |
| Total blocking time | < 200 ms | > 600 ms |
| Lighthouse Performance (mobile) | ≥ 90 | < 80 |
| Lighthouse SEO | 100 | < 95 |
| Lighthouse Accessibility | ≥ 95 | < 90 |

CI runs Lighthouse on the top routes and fails the PR on a hard fail.

---

## 2. Rendering strategy is the main lever

| Route | Strategy |
|---|---|
| Homepage, feeds | Server Component + ISR (`revalidate`) |
| Article detail | Server Component, `generateStaticParams` for popular IDs, ISR |
| Category / tag / region | Server Component + ISR |
| Search results | Server Component reading `searchParams` |
| Admin / author dashboards | Client Component (not indexed) |

Server-rendering a content page gives you: HTML for crawlers, a fast LCP with no JS, and no
client-side request waterfall. A `'use client'` homepage that fetches five endpoints after
hydration gives you the opposite of all three.

```tsx
export const revalidate = 300;   // ISR: regenerate at most every 5 minutes
```

Stream slow sections instead of blocking the whole page:

```tsx
<Suspense fallback={<FeedSkeleton />}>
  <SlowFeedSection />
</Suspense>
```

---

## 3. JavaScript budget

| Technique | Effect |
|---|---|
| `'use client'` at leaves only | the single biggest bundle lever |
| `next/dynamic` for heavy widgets | markdown editor, charts, maps, big modals |
| `date-fns` (tree-shakeable) | avoid whole-library date packages |
| No `lodash` | native methods |
| Analyse before adding a dep | `@next/bundle-analyzer` |
| Remove unused dependencies | `npx depcheck` |

```tsx
const MarkdownEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full" />,
});
```

Check `npm run build` output: every route's First Load JS is printed. A route that jumps by
50 KB in a PR needs an explanation.

---

## 4. Images

Images are usually the LCP element, so this is where LCP is won or lost.

```tsx
<Image
  src={article.image}
  alt={article.title}
  width={1200}
  height={675}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority                       // ONLY on the LCP image
  placeholder="blur"
  blurDataURL={article.blurDataUrl}
/>
```

| # | Rule |
|---|---|
| I1 | Always `next/image`. `<img>` is an ESLint error. |
| I2 | Explicit `width`/`height`, or `fill` with a sized parent — prevents CLS. |
| I3 | Always `sizes` on responsive images, or you ship desktop pixels to phones. |
| I4 | `priority` on exactly one image per page (the LCP one). Marking everything priority marks nothing. |
| I5 | `images.remotePatterns` in `next.config.ts` — not the deprecated `images.domains`. |
| I6 | AVIF/WebP via `formats: ['image/avif', 'image/webp']`. |
| I7 | Compress on upload (client-side) as well as on delivery. |

---

## 5. Fonts

```ts
import { Geist } from 'next/font/google';

const geist = Geist({ subsets: ['latin'], display: 'swap', variable: '--font-geist-sans' });
```

Self-hosted by `next/font`, `display: swap`, exposed as a CSS variable, applied on `<html>`.
Never a `<link>` to a font CDN — that adds a DNS lookup, a connection, and a render-blocking
request on the critical path.

Limit to two families and the weights actually used.

---

## 6. Data-fetching performance

- Prefetch on the server for SEO routes; hydrate the client cache.
- `Promise.all` for independent fetches. Sequential `await`s that don't depend on each other
  are pure added latency.
- `staleTime` tuned so navigating back doesn't refetch.
- `next/link` prefetches on viewport entry by default — keep it.
- Avoid over-fetching: list endpoints must not return article bodies.

---

## 7. Rendering performance

- Stable keys (never `index`).
- `React.memo` only on components that re-render frequently with identical props.
- Virtualise lists over ~100 rows.
- Debounce search input before it hits a query key.
- No expensive computation in a render body.
- Keep client component trees shallow — every `'use client'` boundary pulls its whole import
  graph into the bundle.

---

## 8. SEO essentials

### Metadata on every public route

```tsx
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const article = await fetchArticleById(Number(id));

  return {
    title: article.title,
    description: article.content.slice(0, 155),
    alternates: { canonical: `${env.NEXT_PUBLIC_SITE_URL}/articles/${id}` },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.content.slice(0, 155),
      url: `${env.NEXT_PUBLIC_SITE_URL}/articles/${id}`,
      images: [{ url: article.image, width: 1200, height: 630 }],
      publishedTime: article.publish_date ?? undefined,
      authors: [article.author_name],
    },
    twitter: { card: 'summary_large_image' },
  };
}
```

### Required across the site

| Item | Where |
|---|---|
| `<title>` unique per page, ≤ 60 chars | `generateMetadata` |
| `<meta description>` unique, ≤ 155 chars | `generateMetadata` |
| Canonical URL | `alternates.canonical` |
| Open Graph + Twitter cards | `generateMetadata` |
| JSON-LD structured data | a `<script type="application/ld+json">` in the page |
| `sitemap.xml` | `app/sitemap.ts` |
| News sitemap (if a news site) | `app/news-sitemap.xml/route.ts` |
| `robots.txt` | `app/robots.ts` |
| Semantic HTML | `<article>`, `<nav>`, `<main>`, `<time dateTime>` |
| One `<h1>` per page, no skipped levels | components |
| Descriptive link text | never "click here" |
| `lang` attribute | root `<html lang="en">` |

### Structured data

```tsx
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'NewsArticle',
  headline: article.title,
  image: [article.image],
  datePublished: article.publish_date,
  dateModified: article.updated_at,
  author: [{ '@type': 'Person', name: article.author_name }],
};

<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
```

Validate with Google's Rich Results Test before shipping.

---

## 9. Security headers (they affect SEO and trust)

```ts
// next.config.ts
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: CSP },
    ],
  }];
}
```

CSP: no `unsafe-eval`; `unsafe-inline` for styles only until nonces are wired; explicit
allowlists for image and connect sources.

---

## 10. Measuring

- `npm run build` prints per-route First Load JS — read it every PR.
- `@next/bundle-analyzer` when a route grows.
- Lighthouse CI on the top 5 routes, mobile profile, in the pipeline.
- Real-user monitoring via `useReportWebVitals` → analytics.
- Chromatic catches visual regressions; Lighthouse catches performance ones.

---

## 11. Checklist

- [ ] Public content routes are server-rendered; `'use client'` is at leaves.
- [ ] LCP image has `priority`, correct `sizes`, explicit dimensions.
- [ ] Heavy client widgets are `next/dynamic` with `ssr: false`.
- [ ] Fonts via `next/font` with `display: swap`.
- [ ] Independent fetches parallelised; slow sections streamed with `<Suspense>`.
- [ ] Stable keys; long lists virtualised.
- [ ] `generateMetadata` on every public route, with canonical and OG tags.
- [ ] JSON-LD present and validated.
- [ ] `sitemap.ts` and `robots.ts` in place.
- [ ] Semantic HTML, one `<h1>`, no skipped heading levels.
- [ ] Security headers configured.
- [ ] Route First Load JS within budget; Lighthouse targets met.
