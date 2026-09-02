# Frontend — 11 Accessibility

Target: **WCAG 2.2 Level AA**. Accessibility is a correctness requirement, not a polish task,
and most of it is free if you use the right element.

---

## 1. The rules that catch 90% of issues

| # | Rule |
|---|---|
| A1 | **Use the semantic element.** `<button>` for actions, `<a>` for navigation, `<input>` for input. A `<div onClick>` has no role, no keyboard handling, and no focus. |
| A2 | **Never remove the focus indicator.** `outline: none` without a `focus-visible` replacement is a blocking review comment. |
| A3 | **Everything works by keyboard.** Tab, Shift+Tab, Enter, Space, Escape, arrows in composite widgets. |
| A4 | **Every image has an `alt`.** Meaningful description, or `alt=""` if purely decorative. |
| A5 | **Every input has a visible, associated `<label>`.** A placeholder is not a label. |
| A6 | **Colour is never the only signal.** Add an icon, text, or pattern. |
| A7 | **Contrast ≥ 4.5:1** for body text, **3:1** for large text and UI boundaries. |
| A8 | **One `<h1>`, no skipped heading levels.** |
| A9 | **Announce dynamic changes** with a live region. |
| A10 | **Respect `prefers-reduced-motion`.** |

---

## 2. Semantic structure

```tsx
<html lang="en">
  <body>
    <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
    <header>
      <nav aria-label="Main">…</nav>
    </header>
    <main id="main">
      <h1>Page title</h1>
      <section aria-labelledby="latest-heading">
        <h2 id="latest-heading">Latest news</h2>
        <article>…</article>
      </section>
    </main>
    <footer>…</footer>
  </body>
</html>
```

- One `<main>` per page.
- `<nav>` elements get `aria-label` when there is more than one.
- Card lists are `<ul>` / `<li>` containing `<article>` — a screen reader then announces
  "list, 10 items".
- `<time dateTime="2026-09-02">` for dates.

---

## 3. Interactive elements

```tsx
// ❌ no role, no keyboard, no focus
<div onClick={handleDelete} className="cursor-pointer">Delete</div>

// ✅
<Button variant="destructive" onClick={handleDelete}>Delete</Button>

// ✅ icon-only button needs an accessible name
<Button size="icon" aria-label="Delete article" onClick={handleDelete}>
  <Trash2 className="size-4" aria-hidden="true" />
</Button>

// ✅ navigation is a link, not a button with router.push
<Link href={ROUTES.article(article.id)}>{article.title}</Link>
```

Decorative icons get `aria-hidden="true"` so they aren't announced. Icon-only controls always
get an `aria-label`.

Touch targets ≥ 44×44 px (WCAG 2.2 target size).

---

## 4. Focus management

```css
/* keep this — do not override */
.focus-visible\:ring-\[3px\]:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--ring);
}
```

| Situation | Behaviour |
|---|---|
| Dialog opens | focus moves into the dialog, trapped inside |
| Dialog closes | focus returns to the trigger |
| Route change | focus moves to `<main>` or the `<h1>` |
| Form submit fails | focus moves to the first invalid field |
| Item deleted from a list | focus moves to the next item, not to `<body>` |

Radix handles focus trap and restore for `Dialog`, `AlertDialog`, `Popover`, `DropdownMenu`,
`Sheet`, and `Select` — which is precisely why we use it instead of hand-rolled overlays.

Never `tabIndex` greater than 0. Use `tabIndex={-1}` only to make a container programmatically
focusable.

---

## 5. Forms

```tsx
<FormItem>
  <FormLabel htmlFor="title">Title</FormLabel>
  <FormControl>
    <Input id="title" aria-invalid={!!error} aria-describedby="title-description title-error" {...field} />
  </FormControl>
  <FormDescription id="title-description">Shown on cards and in search results.</FormDescription>
  <FormMessage id="title-error" role="alert" />
</FormItem>
```

- Label associated by `htmlFor`/`id` (shadcn's `Form` does this).
- Errors linked via `aria-describedby` and announced with `role="alert"`.
- `aria-invalid` on failing fields.
- Required marked in the label text, not by colour or placeholder.
- `autoComplete` set correctly (`email`, `current-password`, `new-password`, `name`, `tel`).
- Group related controls with `<fieldset>` + `<legend>`.
- Never disable the submit button as the only feedback — the user can't tell why.

---

## 6. Dynamic content

```tsx
// status messages
<div role="status" aria-live="polite" className="sr-only">
  {isLoading ? 'Loading articles' : `${articles.length} articles loaded`}
</div>

// errors
<div role="alert" aria-live="assertive">{error && messageForError(error)}</div>
```

| Change | Announcement |
|---|---|
| Loading finished | `aria-live="polite"` |
| Validation error | `role="alert"` (assertive) |
| Toast | `sonner` handles it — verify it is announced |
| Infinite scroll loaded more | polite live region with the new count |
| Filter applied | polite live region with the result count |

Live regions must exist in the DOM **before** the content changes, or nothing is announced.

---

## 7. Colour and contrast

| Content | Minimum |
|---|---|
| Body text | 4.5:1 |
| Large text (≥ 18.66px bold or 24px) | 3:1 |
| UI component boundaries, focus rings | 3:1 |
| Disabled elements | exempt, but must still be perceivable |

Verify **both** themes. Fix contrast by changing the **token**, not by overriding a colour in
one component.

Never signal with colour alone:

```tsx
// ❌
<span className="text-red-500">Rejected</span>

// ✅
<Badge variant="destructive">
  <XCircle className="size-3" aria-hidden="true" /> Rejected
</Badge>
```

---

## 8. Images and media

```tsx
<Image src={article.image} alt={`Cover image for ${article.title}`} … />   // meaningful
<Image src="/decorative-swirl.svg" alt="" aria-hidden="true" … />          // decorative
```

Alt text describes **content and function**, not appearance. Don't start with "Image of".
Charts need a text alternative (a table or a summary). Video needs captions; audio needs a
transcript.

---

## 9. Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

No auto-playing motion longer than 5 seconds without a pause control — this applies to the
infinite-scrolling trending-tags marquee, which must be pausable and must stop under
`prefers-reduced-motion`. No content that flashes more than 3 times per second.

---

## 10. Testing accessibility

### Automated (catches ~40%)

- `addon-a11y` with `a11y: { test: 'error' }` — every story is an axe audit that fails CI.
- `eslint-plugin-jsx-a11y` at `error`.
- `jest-axe` / `vitest-axe` on key composed screens.
- Lighthouse Accessibility ≥ 95 in CI.

### Manual (catches the rest) — required before shipping any new screen

- [ ] Unplug the mouse. Complete the whole flow with the keyboard.
- [ ] Tab order follows visual order; focus is always visible.
- [ ] Escape closes overlays; focus returns to the trigger.
- [ ] Zoom to 200% — nothing is clipped, no horizontal scroll.
- [ ] Screen reader pass (VoiceOver ⌘F5 on macOS, NVDA on Windows): headings, landmarks, and
      form labels all make sense read aloud.
- [ ] Force dark mode and re-check contrast.
- [ ] Disable images — is the content still comprehensible?

---

## 11. Common violations and fixes

| Violation | Fix |
|---|---|
| `<div onClick>` | `<button>` |
| Icon button with no name | `aria-label` |
| `outline: none` | keep `focus-visible` ring |
| Placeholder as label | real `<label>` |
| `alt` missing | add it, or `alt=""` |
| Skipped heading level | fix the hierarchy |
| Colour-only status | add icon + text |
| Modal without focus trap | use Radix `Dialog` |
| `aria-label` on a `<div>` with no role | give it a role, or use the right element |
| Redundant ARIA (`role="button"` on `<button>`) | remove it — native is better |
| Auto-playing marquee | pause control + reduced-motion |

**Rule of thumb: no ARIA is better than bad ARIA.** The first rule of ARIA is not to use ARIA
when a native element will do.

---

## 12. Checklist

- [ ] Semantic elements; landmarks present; one `<h1>`.
- [ ] Full keyboard operability; visible focus everywhere.
- [ ] Focus managed on open/close/navigate/error.
- [ ] All inputs labelled; errors linked and announced.
- [ ] Every image has appropriate `alt`.
- [ ] Contrast passes in light and dark.
- [ ] Colour is never the only signal.
- [ ] Live regions for async status changes.
- [ ] `prefers-reduced-motion` respected; marquees pausable.
- [ ] Zero axe violations across all stories.
- [ ] Manual keyboard + screen-reader pass done.
