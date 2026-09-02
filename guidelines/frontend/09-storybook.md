# Frontend — 09 Storybook

Storybook is the component documentation, the visual test suite, and the design review tool.
It is not optional and it is not a side project.

---

## 1. Why it's mandatory

- It is the **only** documentation of what a component looks like in each state — and unlike a
  screenshot in a `doc/` folder, it cannot go stale.
- It forces you to build components that work from props alone (which is the architecture rule
  anyway).
- It is where designers, PMs, and other engineers review UI without running the app.
- With `@storybook/addon-vitest`, every story is also a rendering smoke test.
- With `addon-a11y`, every story is an accessibility audit.

**Every exported component in `components/ui`, `components/molecules`, and
`features/*/components` has a story.** No story, no merge.

---

## 2. Configuration

```ts
// .storybook/main.ts
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
  ],
  framework: { name: '@storybook/nextjs-vite', options: {} },
  staticDirs: ['../public'],
};
export default config;
```

```tsx
// .storybook/preview.tsx
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: 'error' },                 // a11y violations FAIL the story test
    nextjs: { appDirectory: true },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ThemeProvider attribute="class">
          <Story />
        </ThemeProvider>
      </QueryClientProvider>
    ),
  ],
  globalTypes: {
    theme: { toolbar: { items: ['light', 'dark'], dynamicTitle: true } },
  },
};
```

`a11y: { test: 'error' }` is the setting that turns Storybook from a gallery into a gate.

---

## 3. Story file anatomy

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { makeArticle } from '@/test/factories/article';

import { ArticleCard } from './article-card';

const meta = {
  title: 'Features/Article/ArticleCard',
  component: ArticleCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Card summarising a single article. Used in feeds, grids, and related-article rails. ' +
          'Vertical is the default; horizontal is used in sidebars.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'inline-radio', options: ['vertical', 'horizontal'], description: 'Layout orientation.' },
    onSelect: { description: 'Fired with the article id when the card is activated.' },
  },
  args: { article: makeArticle(), onSelect: fn() },
} satisfies Meta<typeof ArticleCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Horizontal: Story = { args: { variant: 'horizontal' } };

export const LongTitle: Story = {
  args: { article: makeArticle({ title: 'A'.repeat(160) }) },
  parameters: { docs: { description: { story: 'Titles clamp to two lines.' } } },
};

export const NoImage: Story = { args: { article: makeArticle({ image: '' }) } };

export const Unpublished: Story = { args: { article: makeArticle({ publish_date: null }) } };

export const CallsOnSelect: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('link'));
    await expect(args.onSelect).toHaveBeenCalledWith(args.article.id);
  },
};
```

---

## 4. Rules

| # | Rule |
|---|---|
| S1 | `title` mirrors the folder structure: `UI/Button`, `Molecules/Header`, `Features/Article/ArticleCard`. |
| S2 | `tags: ['autodocs']` on every meta, so docs are generated. |
| S3 | `docs.description.component` explains **what it is and when to use it** — that is the API doc. |
| S4 | `satisfies Meta<typeof Component>` for full type inference on args. |
| S5 | Shared args in `meta.args`; each story overrides only what it demonstrates. |
| S6 | `fn()` for every callback arg, so the Actions panel works and `play()` can assert. |
| S7 | Data comes from the **same factories the tests use** — never a bespoke literal per story. |
| S8 | Every meaningful state is a story (see §5). |
| S9 | `play()` for interaction behaviour worth documenting. |
| S10 | Stories must render without a running backend. Mock at the args level, or with `msw-storybook-addon`. |
| S11 | No default export other than `meta`; no logic beyond arg construction. |

> The reference's `trending-tags-view.stories.tsx` declares ten arrays of mock tags, most of
> which are never used, and the stories are variations on "different words". Prefer a few
> stories that show *structurally* different states: empty, one item, many items, very long
> items, loading, error.

---

## 5. Required stories per component type

| Component | Stories |
|---|---|
| Any | `Default` |
| With variants | one per variant × one per size |
| With data | `Empty`, `SingleItem`, `ManyItems`, `LongContent` |
| Async-aware | `Loading`, `Error`, `Empty`, `Loaded` |
| Interactive | a `play()` story per key interaction |
| Form | `Pristine`, `WithErrors`, `Submitting`, `Disabled` |
| Responsive | `Mobile` (`parameters.viewport`), `Desktop` |
| Themed | rely on the theme toolbar; add an explicit `DarkMode` story if it differs structurally |

**Edge cases are the point.** A story for a 160-character title catches a layout break that no
unit test would.

---

## 6. Feature components that fetch

A container component that calls a query hook still gets a story — mock the network with MSW:

```tsx
export const Loaded: Story = {
  parameters: {
    msw: { handlers: [http.get('*/articles/approved/latest', () => HttpResponse.json(paginated(makeArticles(6))))] },
  },
};

export const Failed: Story = {
  parameters: {
    msw: { handlers: [http.get('*/articles/approved/latest', () => HttpResponse.json({ success: false, error: { code: 10001, message: 'x' } }, { status: 500 }))] },
  },
};
```

Better still: split the container from the presentational component, and story the
presentational one with plain args. If a component is hard to story, that is a design signal.

---

## 7. Accessibility in Storybook

`addon-a11y` runs axe on every story. With `a11y: { test: 'error' }`, a violation fails CI.

Common failures and their fixes:

| Violation | Fix |
|---|---|
| `color-contrast` | adjust the token, not the component |
| `image-alt` | add `alt`, or `alt=""` for decoration |
| `button-name` | `aria-label` on icon-only buttons |
| `label` | associate the label with the input |
| `aria-required-attr` | Radix usually handles it — check the composition |
| `heading-order` | don't skip levels |

Do not disable a rule to make a story pass. Fix the component.

---

## 8. Visual regression

Chromatic runs on every PR. It diffs every story and blocks on unreviewed changes.

- New component → new baseline, approved once.
- Intentional visual change → review and accept in the PR.
- Unintentional change → you just caught a regression before production.

Keep stories deterministic: no `Math.random`, no `new Date()`, no live network. Non-determinism
makes visual diffs useless.

---

## 9. Workflow

Build the component **in Storybook first**, before wiring it into a page:

1. Write the props interface.
2. Write `Default` and the edge-case stories.
3. Build the component until every story looks right.
4. Fix a11y violations.
5. Add `play()` interactions.
6. Only then wire it into a feature and a page.

This forces prop-driven, testable components and catches layout problems while they are cheap.

---

## 10. Checklist

- [ ] `.stories.tsx` exists for every exported component.
- [ ] `tags: ['autodocs']` and a component description.
- [ ] `satisfies Meta<typeof Component>`.
- [ ] Every variant and size covered.
- [ ] Empty, long-content, loading, and error states covered.
- [ ] Callbacks use `fn()`.
- [ ] Data from shared factories.
- [ ] `play()` for key interactions.
- [ ] Zero a11y violations.
- [ ] Renders with no backend and no non-determinism.
- [ ] `npm run build-storybook` passes in CI.
