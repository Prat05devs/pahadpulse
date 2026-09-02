# Mobile — 10 Accessibility

Same principles as [frontend/11-accessibility.md](../frontend/11-accessibility.md); different
APIs. Target: WCAG 2.2 AA, VoiceOver (iOS) and TalkBack (Android).

---

## 1. The React Native accessibility props

| Prop | Purpose |
|---|---|
| `accessible` | groups children into one accessible element |
| `accessibilityRole` | `button`, `link`, `header`, `image`, `search`, `switch`, `checkbox`, `radio`, `adjustable`, `alert`, `list`, `none` |
| `accessibilityLabel` | the name announced |
| `accessibilityHint` | what happens on activation ("Opens the article") |
| `accessibilityState` | `{ disabled, selected, checked, busy, expanded }` |
| `accessibilityValue` | `{ min, max, now, text }` for sliders/progress |
| `accessibilityLiveRegion` (Android) / `AccessibilityInfo.announceForAccessibility` (iOS) | announce dynamic changes |
| `accessibilityElementsHidden` (iOS) / `importantForAccessibility="no-hide-descendants"` (Android) | hide decorative subtrees |
| `accessibilityViewIsModal` (iOS) | trap focus in a modal |

---

## 2. Interactive elements

```tsx
// Icon-only button
<Pressable
  onPress={handleDelete}
  accessibilityRole="button"
  accessibilityLabel="Delete article"
  accessibilityHint="Permanently removes this article"
  className="h-11 w-11 items-center justify-center"
>
  <Trash2 size={20} />
</Pressable>

// Card acting as a single element
<Pressable
  accessible
  accessibilityRole="button"
  accessibilityLabel={`Article: ${article.title}. ${article.category}. Published ${formatDate(article.publish_date)}`}
  onPress={() => onPress(article.id)}
>
  <ArticleCardContent article={article} />
</Pressable>

// Disabled state must be announced, not just visual
<Pressable
  disabled={isPending}
  accessibilityRole="button"
  accessibilityLabel="Publish"
  accessibilityState={{ disabled: isPending, busy: isPending }}
/>
```

**Rules:**

- Every `Pressable` has a `role` and an accessible name.
- `accessible` on a composite (like a card) so it's announced as one item, not five fragments.
- Minimum touch target **44×44 pt** — `h-11 w-11` at minimum. Use `hitSlop` when the visual is
  smaller than the target.
- `accessibilityState` reflects disabled / selected / checked / busy.

---

## 3. Text and headings

```tsx
<Text accessibilityRole="header" className="text-2xl font-bold">Latest news</Text>
```

- `accessibilityRole="header"` on section titles — screen-reader users navigate by heading.
- Never fix the height of a text container; users can set very large system fonts.
- Test at **200% font scale** on both platforms. If a layout breaks, the layout is wrong.
- `numberOfLines` truncation still announces the full text — which is correct — so don't
  duplicate it into an `accessibilityLabel`.

---

## 4. Images

```tsx
// Meaningful
<Image source={{ uri: article.image }} accessibilityLabel={`Cover image for ${article.title}`} accessible />

// Decorative
<Image source={pattern} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
```

Also set `accessibilityIgnoresInvertColors` on photographic content so iOS's Smart Invert
doesn't produce negatives of photos.

---

## 5. Forms

```tsx
<View>
  <Text nativeID="email-label" className="text-sm font-medium">Email</Text>
  <TextInput
    accessibilityLabel="Email"
    accessibilityLabelledBy="email-label"      // Android
    accessibilityHint="Enter the email you registered with"
    accessibilityState={{ disabled: isPending }}
    keyboardType="email-address"
    autoComplete="email"
    textContentType="emailAddress"             // iOS autofill
    autoCapitalize="none"
    returnKeyType="next"
    onSubmitEditing={() => passwordRef.current?.focus()}
  />
  {error && (
    <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" className="text-destructive text-xs">
      {error}
    </Text>
  )}
</View>
```

- A visible label above every input. A placeholder is not a label.
- Errors announced (`accessibilityRole="alert"` / `accessibilityLiveRegion="assertive"`).
- `keyboardType`, `autoComplete`, `textContentType`, `autoCapitalize` set correctly — this is
  both accessibility and basic usability.
- `returnKeyType` + `onSubmitEditing` chain focus through the form.
- On submit failure, move focus to the first invalid field:
  `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(ref.current))`.

---

## 6. Dynamic content

```tsx
// Status
<View accessibilityLiveRegion="polite">
  <Text>{isLoading ? 'Loading articles' : `${articles.length} articles`}</Text>
</View>

// iOS explicit announcement
AccessibilityInfo.announceForAccessibility('Article published');
```

Announce: load completion, validation errors, toast messages, offline/online transitions, and
"loaded 10 more" on infinite scroll.

Live regions must exist in the tree **before** the content changes.

---

## 7. Modals and focus

```tsx
<Modal visible={isOpen} onRequestClose={close}>
  <View accessibilityViewIsModal accessibilityRole="alert">
    <Text accessibilityRole="header">Delete article?</Text>
    …
  </View>
</Modal>
```

- `accessibilityViewIsModal` (iOS) so the screen reader doesn't wander behind the modal.
- `onRequestClose` (Android back button) always implemented.
- Focus moves into the modal on open and returns to the trigger on close.

---

## 8. Colour, contrast, and motion

- Contrast 4.5:1 for body text, 3:1 for large text and UI boundaries. Check in **both**
  themes — dark mode is where contrast usually fails.
- Never colour alone: add an icon or text to status badges.
- Reduced motion:

  ```tsx
  const reduceMotion = useReducedMotion();       // react-native-reanimated
  const duration = reduceMotion ? 0 : 300;
  ```

  Auto-scrolling carousels and marquees must stop under reduced motion and always offer a
  pause control.

---

## 9. Platform specifics

| Concern | iOS | Android |
|---|---|---|
| Screen reader | VoiceOver | TalkBack |
| Enable quickly | Settings → Accessibility → VoiceOver (triple-click side button) | Settings → Accessibility → TalkBack |
| Focus order | follows the view hierarchy | follows the view hierarchy |
| Live region | `announceForAccessibility` | `accessibilityLiveRegion` |
| Modal isolation | `accessibilityViewIsModal` | `importantForAccessibility` on siblings |
| Font scaling | Dynamic Type | Font size + Display size (both!) |
| Autofill | `textContentType` | `autoComplete` |

Android's **Display size** setting scales layout as well as text and breaks more layouts than
font scaling alone. Test both.

---

## 10. Testing

### Automated

- `eslint-plugin-react-native-a11y` at `error`.
- RNTL queries by role and label — a `getByRole` test *is* an accessibility test.
- Assert `accessibilityState` for disabled/selected/busy.

```tsx
expect(screen.getByRole('button', { name: 'Delete article' })).toBeOnTheScreen();
expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
```

### Manual — required for every new screen

- [ ] VoiceOver on: swipe through every element. Does the announcement make sense?
- [ ] TalkBack on: same.
- [ ] Every control reachable and activatable by screen reader.
- [ ] Focus order matches visual order.
- [ ] Modals trap focus and return it.
- [ ] Font scale 200% (iOS) and Display size largest (Android) — nothing clipped or overlapping.
- [ ] Dark mode contrast checked.
- [ ] Reduce Motion on — no jarring animation.
- [ ] All touch targets comfortably tappable.

---

## 11. Common violations

| Violation | Fix |
|---|---|
| Icon button with no label | `accessibilityLabel` |
| `View` with `onTouchEnd` instead of `Pressable` | use `Pressable` with a role |
| Card announced as five fragments | `accessible` on the wrapper + one composed label |
| Disabled announced as enabled | `accessibilityState={{ disabled: true }}` |
| Section title not announced as a heading | `accessibilityRole="header"` |
| Error not announced | `accessibilityRole="alert"` + live region |
| Layout breaks at large font | remove fixed heights |
| Touch target < 44 pt | resize or `hitSlop` |
| Decorative image announced | `accessibilityElementsHidden` / `importantForAccessibility` |
| Modal content behind still reachable | `accessibilityViewIsModal` |

---

## 12. Checklist

- [ ] Every interactive element has a role and an accessible name.
- [ ] Composite items grouped with `accessible`.
- [ ] `accessibilityState` reflects disabled/selected/busy.
- [ ] Headings marked with `accessibilityRole="header"`.
- [ ] Images labelled or explicitly hidden.
- [ ] Inputs labelled, with correct keyboard/autofill props; errors announced.
- [ ] Dynamic changes announced via live regions.
- [ ] Modals isolate and restore focus; Android back closes them.
- [ ] Contrast verified in light and dark.
- [ ] Reduced motion respected; marquees pausable.
- [ ] Touch targets ≥ 44 pt.
- [ ] VoiceOver and TalkBack passes completed on the new screen.
