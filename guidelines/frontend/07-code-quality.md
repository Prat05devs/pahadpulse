# Frontend — 07 Code Quality

React/Next-specific rules on top of [common/08-code-quality.md](../common/08-code-quality.md).

---

## 1. Component rules

| # | Rule |
|---|---|
| C1 | Function declarations, named exports. No `React.FC`, no arrow-assigned components, no default export (except `app/` files and stories, which the framework requires). |
| C2 | Props interface named `<Component>Props`, declared directly above the component. |
| C3 | One component per file. A tiny private sub-component in the same file is fine if it is not exported. |
| C4 | ≤ 250 lines. Beyond that, split — usually a list row or a form section wants extracting. |
| C5 | ≤ 7 props. More means the component does too much, or the props want grouping into an object. |
| C6 | `className?: string` is always the **last** prop and is merged with `cn()` last. |
| C7 | No data fetching in a presentational component. |
| C8 | `'use client'` only where interactivity is actually needed, at the leaf. |
| C9 | Every exported component has a `.stories.tsx`. |
| C10 | Never mutate props. `no-param-reassign` is on. |

```tsx
// ✅
interface ArticleCardProps {
  article: Article;
  variant?: 'vertical' | 'horizontal';
  onSelect?: (id: number) => void;
  className?: string;
}

export function ArticleCard({ article, variant = 'vertical', onSelect, className }: ArticleCardProps) { ... }

// ❌
export default ({ article, ...rest }: any) => { ... }
```

---

## 2. Hook rules

| # | Rule |
|---|---|
| HK1 | Hooks at the top level only — never in a condition, loop, or callback. |
| HK2 | Complete dependency arrays. `react-hooks/exhaustive-deps` is `error`, never disabled. |
| HK3 | Every effect that subscribes, times, or listens returns a cleanup function. |
| HK4 | ≤ 2 `useEffect` per component. More means the component has multiple jobs. |
| HK5 | Never `useEffect` to derive state — compute during render. |
| HK6 | `useCallback`/`useMemo` only when there is a measured reason: a dependency of another hook, a prop to a memoised child, or a genuinely expensive computation. Otherwise they cost more than they save. |
| HK7 | Custom hooks return objects (named fields), not positional tuples, once there are more than two values. |

```tsx
// ❌ derived state via effect — extra render, stale window
const [fullName, setFullName] = useState('');
useEffect(() => { setFullName(`${first} ${last}`); }, [first, last]);

// ✅
const fullName = `${first} ${last}`;
```

```tsx
// ❌ conditional hook
if (isAdmin) { const { data } = useAdminStats(); }

// ✅
const { data } = useAdminStats({ enabled: isAdmin });
```

---

## 3. Rendering rules

| # | Rule |
|---|---|
| R1 | **Keys are stable IDs.** `key={index}` is a blocking comment — it corrupts state and animations on reorder. |
| R2 | No inline object/array/function literals as props to memoised children (new identity every render). |
| R3 | Conditional rendering with ternaries or early returns; avoid `&&` with a number (`count && <X/>` renders `0`). |
| R4 | Nesting ≤ 3 ternaries deep — extract a component instead. |
| R5 | Every list has a loading, empty, error, and success state. |
| R6 | Never define a component inside another component's body — it remounts every render. |
| R7 | `dangerouslySetInnerHTML` requires sanitised HTML and a comment explaining why. |

```tsx
// ❌
{articles.map((a, i) => <ArticleCard key={i} article={a} />)}
{count && <Badge>{count}</Badge>}                 // renders "0"

// ✅
{articles.map((a) => <ArticleCard key={a.id} article={a} />)}
{count > 0 && <Badge>{count}</Badge>}
```

---

## 4. Next.js rules

| # | Rule |
|---|---|
| N1 | `app/` files stay thin (≤ 60 lines): params, metadata, composition. |
| N2 | Server Component by default. `'use client'` is an explicit decision recorded in the plan. |
| N3 | `generateMetadata` on every public route. |
| N4 | `next/link` for internal navigation — never `<a href>` (full page reload). |
| N5 | `next/image` for every image, with `sizes`. |
| N6 | `next/font` for fonts; never a `<link>` to a font CDN. |
| N7 | `next/dynamic` for heavy client-only widgets (markdown editor, charts). |
| N8 | Route handlers in `app/api/` are BFF glue only — no business logic. |
| N9 | Never read a server secret in a Client Component. |
| N10 | Props crossing the server→client boundary must be serialisable. |

---

## 5. ESLint additions

```js
rules: {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'error',       // error, not warn
  'react/jsx-key': ['error', { checkFragmentShorthand: true }],
  'react/no-array-index-key': 'error',
  'react/no-unstable-nested-components': 'error',
  'react/jsx-no-useless-fragment': 'error',
  'react/self-closing-comp': 'error',
  'jsx-a11y/alt-text': 'error',
  'jsx-a11y/anchor-is-valid': 'error',
  'jsx-a11y/label-has-associated-control': 'error',
  'jsx-a11y/no-static-element-interactions': 'error',
  'jsx-a11y/click-events-have-key-events': 'error',
  '@next/next/no-img-element': 'error',
  '@next/next/no-html-link-for-pages': 'error',
  'no-console': 'error',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
}
```

Plus the boundary zones from
[01-folder-structure.md](01-folder-structure.md#6-import-rules), and a restriction that keeps
`fetch` out of components:

```js
{
  files: ['src/components/**/*.tsx', 'src/features/**/components/**/*.tsx'],
  rules: {
    'no-restricted-globals': ['error', { name: 'fetch', message: 'Use a feature service via a hook.' }],
  },
}
```

Relaxations allowed only in: `src/app/**` and `**/*.stories.tsx`
(`import/no-default-export` off), and test files.

---

## 6. Anti-patterns (blocking)

| Anti-pattern | Instead |
|---|---|
| `fetch` inside a component | service + hook |
| `useEffect` + `setState` to load data | `useQuery` |
| `useEffect` deriving state | compute during render |
| `key={index}` | stable entity ID |
| `any` on props or API results | Zod-inferred types |
| `'use client'` on a page or layout | push it to the interactive leaf |
| Component defined inside a component | move it out |
| `error.message.includes('...')` | switch on `error.code` |
| Only rendering the success state | all four states |
| Hardcoded colour / hex | design token |
| `outline: none` without `focus-visible` | keep the focus ring |
| `<div onClick>` | `<button>` |
| `<img>` | `next/image` |
| `<a href="/x">` internal | `next/link` |
| Duplicated component across features | promote to `components/molecules/` |
| Business data inside a presentational component | pass as props |
| Prop drilling ≥ 3 levels | composition, or a scoped Context |
| `console.log` | remove, or `lib/logger` |

---

## 7. Performance rules

- Memoise only with a reason: `React.memo` on a component that renders often with identical
  props; `useMemo` for expensive computation; `useCallback` for a function that is a
  dependency or a prop to a memoised child.
- Virtualise lists over ~100 rows.
- `next/dynamic` the markdown editor, charts, and any heavy modal body.
- Never do heavy work in a render body.
- Keep `'use client'` boundaries as small as possible — every client component is shipped JS.

---

## 8. File-level checklist

- [ ] Named export, function declaration, `<Component>Props` interface.
- [ ] ≤ 250 lines, ≤ 7 props, ≤ 2 effects.
- [ ] No `any`, no `!`, no `console`.
- [ ] Stable keys.
- [ ] `cn(...)` with incoming `className` last.
- [ ] Loading / error / empty / success all handled.
- [ ] Accessible: roles, labels, keyboard, focus ring.
- [ ] Story file exists and covers the variants.
- [ ] Test file exists and covers conditional branches.
- [ ] No fetch; no direct service call; goes through a hook.
- [ ] `npm run verify` green.
