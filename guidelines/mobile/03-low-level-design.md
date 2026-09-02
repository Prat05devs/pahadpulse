# Mobile — 03 Low-Level Design

`frontend/03-low-level-design.md` applies in full for types, services, query keys, and hooks —
those files should be **identical** to the web app's. This file covers what differs: screens,
RN components, and platform primitives.

---

## 1. Route file

Thin. Params in, one screen component out.

```tsx
// app/articles/[id].tsx
export default function ArticleRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const articleId = Number(id);

  if (!Number.isInteger(articleId) || articleId <= 0) return <NotFoundScreen />;

  return (
    <>
      <Stack.Screen options={{ title: 'Article', headerBackTitle: 'Back' }} />
      <ArticleDetailScreen articleId={articleId} />
    </>
  );
}
```

Validate route params — a deep link can deliver anything. This is a boundary, so it gets the
same treatment as any other untrusted input.

---

## 2. Screen component

Lives in the feature. The only component type that calls fetching hooks.

```tsx
// src/features/article/components/article-detail-screen.tsx
interface ArticleDetailScreenProps {
  articleId: number;
}

export function ArticleDetailScreen({ articleId }: ArticleDetailScreenProps) {
  const { data, isLoading, error, refetch, isRefetching } = useArticle(articleId);
  const isOnline = useNetworkStatus();

  if (isLoading) return <ArticleDetailSkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} isOffline={!isOnline} />;
  if (!data) return <EmptyState title="Article not available" />;

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="px-4 pb-12"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <ArticleHeader article={data} />
        <ArticleBody content={data.content} />
        <ArticleTags tags={data.tags} />
      </ScrollView>
    </SafeAreaView>
  );
}
```

**Five states on mobile**, not four: loading, error, empty, **offline**, success.

Pull-to-refresh via `RefreshControl` bound to `refetch`/`isRefetching` is expected on every
scrollable data screen.

---

## 3. Presentational component

```tsx
interface ArticleCardProps {
  article: Article;
  onPress?: (id: number) => void;
  className?: string;
}

export function ArticleCard({ article, onPress, className }: ArticleCardProps) {
  return (
    <Pressable
      onPress={() => onPress?.(article.id)}
      accessibilityRole="button"
      accessibilityLabel={`Article: ${article.title}`}
      className={cn('flex-row gap-3 rounded-lg bg-card p-3 active:opacity-80', className)}
    >
      <Image
        source={{ uri: article.image }}
        style={{ width: 96, height: 96 }}
        contentFit="cover"
        transition={200}
        className="rounded-md"
        accessibilityIgnoresInvertColors
      />
      <View className="flex-1">
        <CategoryBadge category={article.category} />
        <Text numberOfLines={2} className="mt-1 text-base font-semibold text-foreground">
          {article.title}
        </Text>
        <Text className="mt-1 text-xs text-muted-foreground">{formatDate(article.publish_date)}</Text>
      </View>
    </Pressable>
  );
}
```

Rules: named export; `<Component>Props` interface; `className` last, merged with `cn()`;
`Pressable` (not `TouchableOpacity`) with `accessibilityRole` and `accessibilityLabel`;
`numberOfLines` on any text that can overflow — RN does not wrap-and-clip like the web.

---

## 4. Web → React Native element mapping

| Web | React Native | Notes |
|---|---|---|
| `<div>` | `<View>` | no text children allowed |
| text | `<Text>` | **all** text must be inside `<Text>` or it crashes |
| `<button>` | `<Pressable>` | always set `accessibilityRole="button"` |
| `<a>` | `<Link>` (expo-router) or `Pressable` + `router.push` | |
| `<img>` | `<Image>` from `expo-image` | never RN's built-in `Image` |
| `<input>` | `<TextInput>` | |
| `<ul>`/list | `<FlashList>` | never `.map()` for long lists |
| scroll container | `<ScrollView>` | only for bounded content |
| `<form>` | a `<View>` + submit `Pressable` | no native form element |
| CSS `:hover` | none | design for press states |
| `position: fixed` | absolute + `SafeAreaView` | |

---

## 5. Lists

```tsx
<FlashList
  data={articles}
  renderItem={({ item }) => <ArticleCard article={item} onPress={handlePress} />}
  keyExtractor={(item) => String(item.id)}
  estimatedItemSize={120}
  onEndReached={() => hasNextPage && fetchNextPage()}
  onEndReachedThreshold={0.5}
  ListEmptyComponent={<EmptyState title="No articles yet" />}
  ListFooterComponent={isFetchingNextPage ? <ActivityIndicator /> : null}
  refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
/>
```

| # | Rule |
|---|---|
| L1 | `FlashList` for anything over ~20 rows. `ScrollView` + `.map()` renders every row and will jank. |
| L2 | `estimatedItemSize` is required and must be roughly accurate. |
| L3 | `keyExtractor` returns a stable entity ID — never the index. |
| L4 | `renderItem` renders a **memoised** component; never an inline arrow with heavy JSX. |
| L5 | Infinite scroll uses `useInfiniteQuery` + `onEndReached`. |
| L6 | Always provide `ListEmptyComponent`. |
| L7 | Keep row components cheap — no per-row date formatting of a heavy library, no per-row `useQuery`. |

---

## 6. Safe areas and keyboard

```tsx
<SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    className="flex-1"
  >
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="p-4">
      {/* form */}
    </ScrollView>
  </KeyboardAvoidingView>
</SafeAreaView>
```

Every screen accounts for notches, home indicators, and the status bar. Every screen with a
text input handles the keyboard. `keyboardShouldPersistTaps="handled"` — otherwise the first
tap only dismisses the keyboard and the user has to tap your button twice.

Test on: iPhone with a notch, iPhone SE (small), a tall Android, and a device with gesture
navigation.

---

## 7. Platform differences

```ts
const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  android: { elevation: 4 },
  default: {},
});
```

Use `Platform.select` for small differences. Reserve `Component.ios.tsx` / `Component.android.tsx`
for genuinely different implementations.

Known divergences to handle explicitly:

| Concern | iOS | Android |
|---|---|---|
| Back navigation | swipe from left edge | hardware/gesture back button — must be handled |
| Shadows | `shadow*` props | `elevation` |
| Status bar | `StatusBar` style | also background colour |
| Fonts | family names | family names differ |
| Haptics | rich | limited |
| Permissions | prompt once, then settings | can re-prompt |
| Safe area | notch + home indicator | varies wildly |

Android's hardware back button must be handled on any screen where the default is wrong (e.g.
a multi-step form) using `useFocusEffect` + `BackHandler`.

---

## 8. Text

```tsx
<Text numberOfLines={2} ellipsizeMode="tail" className="text-base font-semibold text-foreground">
  {article.title}
</Text>
```

- All text inside `<Text>`. A stray string in a `<View>` throws at runtime.
- `numberOfLines` wherever content is user-generated.
- Never a fixed height on a text container — dynamic type will overflow it.
- Respect the OS font-scale setting; test at 200% text size.

---

## 9. Storage wrappers — `lib/storage.ts`

Never call `SecureStore` / `AsyncStorage` directly from a feature.

```ts
const TOKEN_KEY = 'auth.accessToken';
const REFRESH_KEY = 'auth.refreshToken';

export const secureStorage = {
  async getToken(): Promise<string | null> { return SecureStore.getItemAsync(TOKEN_KEY); },
  async setToken(token: string): Promise<void> { await SecureStore.setItemAsync(TOKEN_KEY, token); },
  async clear(): Promise<void> {
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)]);
  },
};

export const preferences = {
  async get<T>(key: string, schema: ZodType<T>): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    const parsed = schema.safeParse(JSON.parse(raw));   // storage is a boundary — validate it
    return parsed.success ? parsed.data : null;
  },
  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
};
```

Storage is an untrusted boundary: a value written by an older app version can be any shape.
Always Zod-parse on read.

---

## 10. Device hooks — `src/hooks/`

```ts
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => NetInfo.addEventListener((s) => setIsOnline(!!s.isConnected)), []);
  return isOnline;
}

export function useAppState(): AppStateStatus {
  const [state, setState] = useState(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', setState);
    return () => sub.remove();
  }, []);
  return state;
}
```

Every subscription is cleaned up. A leaked `AppState` listener survives navigation and fires
against unmounted components.

---

## 11. LLD checklist

- [ ] Route file ≤ 60 lines; params validated.
- [ ] Screen component lives in the feature, renders all five states.
- [ ] Pull-to-refresh on scrollable data screens.
- [ ] `FlashList` with `estimatedItemSize` and a stable `keyExtractor` for long lists.
- [ ] `SafeAreaView` + `KeyboardAvoidingView` where relevant.
- [ ] All text inside `<Text>`, with `numberOfLines` where it can overflow.
- [ ] `Pressable` with `accessibilityRole` and `accessibilityLabel`.
- [ ] `expo-image` for every image.
- [ ] Storage only via `lib/storage.ts`, Zod-parsed on read; tokens in SecureStore.
- [ ] Every subscription cleaned up.
- [ ] Android back button handled where the default is wrong.
- [ ] Types/services/queries identical to the web app's.
