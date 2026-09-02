# Mobile — 09 Performance

On mobile the bottleneck is not bundle size — it is **the JS thread, list rendering, and
images**. Optimise in that order.

---

## 1. Budgets

| Metric | Target |
|---|---|
| Cold start to first meaningful paint | < 2.0 s |
| Warm start | < 500 ms |
| Screen transition | < 300 ms |
| List scroll | 60 fps, zero dropped frames on a mid-range Android |
| Time to interactive after tap | < 100 ms |
| JS bundle (OTA) | < 4 MB |
| App install size | < 60 MB |
| Memory, steady state | < 250 MB |
| Frame drops during animation | 0 |

**Measure on a mid-range Android device, not a flagship iPhone.** Anything is 60 fps on an
iPhone 15 Pro; that tells you nothing about your users.

---

## 2. Lists — the number one issue

```tsx
const ArticleRow = memo(function ArticleRow({ article, onPress }: ArticleRowProps) {
  return <ArticleCard article={article} onPress={onPress} />;
});

export function ArticleFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteArticles();
  const articles = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const handlePress = useCallback((id: number) => router.push(ROUTES.article(id)), []);

  return (
    <FlashList
      data={articles}
      renderItem={({ item }) => <ArticleRow article={item} onPress={handlePress} />}
      keyExtractor={(item) => String(item.id)}
      estimatedItemSize={120}
      onEndReached={() => { if (hasNextPage) void fetchNextPage(); }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator /> : null}
    />
  );
}
```

| # | Rule |
|---|---|
| P1 | `FlashList` for anything over ~20 rows. |
| P2 | `estimatedItemSize` must be close to reality — a bad estimate defeats recycling. |
| P3 | Row components are `memo`'d, and their props are stable (`useCallback` the handler, don't build objects inline). |
| P4 | `keyExtractor` returns a stable ID. |
| P5 | Rows are **cheap**: no per-row `useQuery`, no per-row heavy date formatting, no per-row shadow on Android. |
| P6 | Flatten pages with `useMemo`, not on every render. |
| P7 | Uniform row heights where possible — variable heights cost measurement. |
| P8 | Never nest a `FlashList` in a `ScrollView`. |

`onEndReachedThreshold={0.5}` starts fetching half a screen early, so the user rarely sees the
spinner.

---

## 3. Images

```tsx
<Image
  source={{ uri: article.thumbnailUrl }}     // server-resized, not the original
  style={{ width: 96, height: 96 }}
  contentFit="cover"
  placeholder={article.blurhash}
  transition={200}
  cachePolicy="memory-disk"
  recyclingKey={String(article.id)}          // correct behaviour inside FlashList
/>
```

- `expo-image` always: memory + disk cache, blurhash placeholders, transitions.
- **Request the size you display.** Downloading a 4000px original for a 96px thumbnail is the
  single most common cause of scroll jank and data-usage complaints.
- `recyclingKey` inside recycled lists prevents the wrong image flashing in a reused row.
- Explicit dimensions or `aspectRatio` — never an unsized image.
- Prefetch above-the-fold images for the next screen when it's predictable.

---

## 4. Re-renders

The usual culprits:

```tsx
// ❌ new object identity every render — re-renders every consumer
<AuthContext.Provider value={{ user, login, logout }}>

// ✅
const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
<AuthContext.Provider value={value}>
```

- Split Contexts by update frequency. A single "app context" holding session + theme + network
  status re-renders the world when any of them changes.
- `memo` components that render in lists or under a frequently-changing parent.
- `useCallback` handlers passed to memoised children.
- Don't `useMemo` everything — it has a cost. Use it where it prevents a cascade.
- Use the React DevTools profiler / `react-native-performance` to find real problems before
  memoising.

---

## 5. Animations

```tsx
const offset = useSharedValue(0);
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: offset.value }],
}));
```

- **Reanimated worklets run on the UI thread.** A JS-thread `Animated` animation stutters
  whenever JS is busy (which, during a fetch or a list render, is often).
- Animate only `transform` and `opacity`. Animating `width`, `height`, `top`, or `margin`
  triggers layout on every frame.
- `useNativeDriver: true` if you must use RN's `Animated`.
- Gestures via `react-native-gesture-handler`, not `PanResponder`.
- Defer heavy work until an animation finishes:

  ```ts
  InteractionManager.runAfterInteractions(() => { /* expensive setup */ });
  ```

---

## 6. Startup time

```
launch → native init → JS bundle load → root render → session restore → first screen
```

| Technique | Effect |
|---|---|
| Keep the root layout minimal | fewer providers to initialise |
| Lazy-load heavy screens | Expo Router does this per-route already |
| Defer non-critical init (analytics, feature flags) to after the first paint | seconds |
| Restore the session from SecureStore in parallel with font loading | hundreds of ms |
| Hide the splash only when the first screen is genuinely ready | perceived speed |
| Enable Hermes (default) | faster startup, lower memory |
| Enable the New Architecture when the SDK supports it for all your deps | across the board |

Don't run migrations, prefetch ten queries, or hit analytics before the first paint.

---

## 7. JS thread discipline

The JS thread renders, handles gestures, and runs your code. Block it and the app freezes.

- No synchronous heavy computation during render.
- Parse large JSON off the critical path; paginate so payloads stay small.
- Don't `JSON.parse` a multi-megabyte cache blob on startup — that is why the persisted cache is
  throttled and size-bounded.
- Debounce text-input-driven work.
- Move expensive filtering/sorting to the server.

---

## 8. Memory

- Recycled lists (`FlashList`) instead of rendering everything.
- Bounded image cache; clear it when the OS signals memory pressure.
- Clean up every subscription, timer, and listener.
- Don't hold large arrays in Context.
- Watch for leaks with Xcode Instruments / Android Profiler when a screen is suspected.

---

## 9. Network

- Cache-first for lists (`networkMode: 'offlineFirst'`).
- Paginate everything.
- Request server-resized images.
- No polling; use push.
- Timeouts on every request.
- Batch analytics events; never one request per event.

---

## 10. Measuring

| Tool | For |
|---|---|
| Expo dev menu → Performance monitor | JS and UI fps while scrolling |
| React DevTools Profiler | re-render cascades |
| `react-native-performance` | startup and custom marks |
| Flipper / Xcode Instruments / Android Profiler | memory, CPU, native |
| Sentry Performance | real-user startup and screen-load traces |
| `npx expo export` output | bundle size |

**Profile before optimising.** A PR claiming a performance fix includes before/after numbers
from a real mid-range Android device.

---

## 11. Checklist

- [ ] Long lists use `FlashList` with an accurate `estimatedItemSize`.
- [ ] Row components memoised; handlers stable; rows cheap.
- [ ] Images sized to display, `expo-image`, `cachePolicy`, `recyclingKey` in lists.
- [ ] Context values memoised; contexts split by update frequency.
- [ ] Animations use Reanimated worklets on `transform`/`opacity` only.
- [ ] Non-critical startup work deferred; splash hidden when genuinely ready.
- [ ] No heavy synchronous work on the JS thread.
- [ ] Every subscription and timer cleaned up.
- [ ] Verified at 60 fps on a mid-range Android device.
- [ ] Before/after numbers included for any performance claim.
