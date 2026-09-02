# Mobile — 05 Navigation

Expo Router. File-based, typed, deep-linkable. Deliberately mirrors the Next.js App Router so
web and mobile engineers read the same structure.

---

## 1. Structure

```
app/
├── _layout.tsx              root: providers + auth gate
├── +not-found.tsx
├── (auth)/
│   ├── _layout.tsx          Stack, headerShown: false
│   └── login.tsx
├── (tabs)/
│   ├── _layout.tsx          Tabs
│   ├── index.tsx            Home
│   ├── explore.tsx
│   └── profile.tsx
├── articles/
│   └── [id].tsx             pushed onto the active stack
└── modal/
    └── filters.tsx          presentation: 'modal'
```

| Convention | Meaning |
|---|---|
| `(group)/` | shared layout, **no** URL segment |
| `[param].tsx` | dynamic segment |
| `[...rest].tsx` | catch-all |
| `_layout.tsx` | navigator for that folder |
| `+not-found.tsx` | fallback |

---

## 2. Root layout

```tsx
// app/_layout.tsx
export default function RootLayout() {
  const [fontsLoaded] = useFonts({ /* ... */ });
  const { session, isRestoring } = useAuth();

  useEffect(() => {
    if (fontsLoaded && !isRestoring) void SplashScreen.hideAsync();
  }, [fontsLoaded, isRestoring]);

  if (!fontsLoaded || isRestoring) return null;   // splash stays up

  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
          <StatusBar />
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
```

Keep the splash screen visible until fonts are loaded **and** the session has been restored
from SecureStore. Otherwise the user sees a login screen flash before being redirected into the
app — the single most common Expo polish bug.

---

## 3. Auth gating — redirect, don't swap navigators

```tsx
// app/_layout.tsx (inside AuthProvider's subtree)
function AuthGate() {
  const { session, isRestoring } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isRestoring) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) router.replace('/(auth)/login');
    else if (session && inAuthGroup) router.replace('/(tabs)');
  }, [session, segments, isRestoring, router]);

  return null;
}
```

**Do not** conditionally render two different navigator trees. That unmounts the whole stack on
login/logout, loses navigation state, and breaks deep links that arrive before auth resolves.
Mount one tree; redirect within it.

Client-side gating is UX. The API still authorises every request.

---

## 4. Navigating

```tsx
import { Link, router } from 'expo-router';

// Declarative — preferred, because it is a real pressable link for accessibility
<Link href={`/articles/${article.id}`} asChild>
  <Pressable accessibilityRole="link"><ArticleCard article={article} /></Pressable>
</Link>

// Imperative — after an action
router.push(`/articles/${id}`);     // adds to the stack
router.replace('/(tabs)');          // replaces — use after login/logout
router.back();
router.dismissAll();                // close all modals
```

| Use | When |
|---|---|
| `push` | normal forward navigation |
| `replace` | after login, logout, or completing a flow the user shouldn't return to |
| `back` | explicit back action |
| `navigate` | when you want to reuse an existing screen in the stack |

Never build a path with a raw template literal at the call site. Use a `ROUTES` helper, exactly
as on web:

```ts
export const ROUTES = {
  home: '/(tabs)',
  article: (id: number) => `/articles/${id}`,
  login: '/(auth)/login',
} as const;
```

---

## 5. Params

```tsx
const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
```

Params are **always strings** (or arrays), and they come from an untrusted source — a deep
link, a push notification, or a malformed URL. Validate them:

```tsx
const ParamsSchema = z.object({ id: z.coerce.number().int().positive() });
const parsed = ParamsSchema.safeParse(useLocalSearchParams());
if (!parsed.success) return <NotFoundScreen />;
```

Pass **IDs, not objects**. Serialising a whole article into a route param is fragile and blows
past URL limits; pass the ID and read from the query cache — it will usually be an instant
cache hit.

---

## 6. Screen options

```tsx
<Stack.Screen
  options={{
    title: 'Article',
    headerBackTitle: 'Back',
    headerRight: () => <ShareButton articleId={id} />,
    animation: 'slide_from_right',
  }}
/>
```

Set options in the **route file**, not in the screen component — that keeps the screen
component renderable in tests and Storybook without a navigator.

Tabs:

```tsx
<Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerShown: false }}>
  <Tabs.Screen
    name="index"
    options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
  />
</Tabs>
```

Tab labels are always visible (icon-only tab bars fail accessibility and usability testing).

---

## 7. Deep links

```ts
// app.config.ts
scheme: 'basictech',
ios: { associatedDomains: ['applinks:app.example.com'] },
android: {
  intentFilters: [{
    action: 'VIEW',
    autoVerify: true,
    data: [{ scheme: 'https', host: 'app.example.com' }],
    category: ['BROWSABLE', 'DEFAULT'],
  }],
},
```

Expo Router maps URLs to files automatically: `basictech://articles/42` and
`https://app.example.com/articles/42` both open `app/articles/[id].tsx`.

**Rules:**

| # | Rule |
|---|---|
| DL1 | Every deep-linkable screen must render correctly with **no stack behind it**. Provide a sensible back destination (`router.replace(ROUTES.home)` if `!router.canGoBack()`). |
| DL2 | Deep links that require auth must survive the login redirect — store the intended path and navigate there after login. |
| DL3 | Validate every param. |
| DL4 | Every push notification payload carries the deep-link path; handle foreground, background, and cold-start delivery. |
| DL5 | Test with `npx uri-scheme open basictech://articles/42 --ios` (and `--android`) as part of the feature's acceptance. |

---

## 8. Modals and sheets

```tsx
<Stack.Screen name="modal/filters" options={{ presentation: 'modal' }} />
```

- Modals are routes, so they are deep-linkable and back-button-correct.
- iOS: swipe-to-dismiss is expected. Android: back button must close it.
- A modal with unsaved changes confirms before dismissing.
- Bottom sheets that are purely transient UI (a sort picker) can be component state instead of
  a route — but anything the user might link to or navigate back to is a route.

---

## 9. Android back button

```tsx
useFocusEffect(
  useCallback(() => {
    const onBackPress = (): boolean => {
      if (hasUnsavedChanges) { showDiscardDialog(); return true; }   // handled
      return false;                                                   // default
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [hasUnsavedChanges]),
);
```

Handle it wherever the default behaviour is wrong: multi-step forms, unsaved editors, and the
root screen (where back should exit the app, not pop to a login screen).

---

## 10. Navigation state and lifecycle

- Navigation state does **not** need manual persistence — Expo Router restores from the URL.
- Screen data comes from the query cache, so returning to a screen is instant.
- `useFocusEffect` for work that should run when a screen regains focus; **always clean up**.
- Don't refetch on every focus — TanStack Query's `staleTime` already handles it.

---

## 11. Checklist

- [ ] One navigator tree; auth handled by redirect, not by swapping trees.
- [ ] Splash held until fonts and session are ready.
- [ ] Paths from `ROUTES`, never inline template literals.
- [ ] Route params Zod-validated.
- [ ] IDs passed as params; objects read from cache.
- [ ] Screen options set in the route file.
- [ ] Every deep-linkable screen works with an empty stack.
- [ ] Post-login redirect returns to the originally requested deep link.
- [ ] Modals are routes; Android back closes them.
- [ ] Android hardware back handled where the default is wrong.
- [ ] Deep links manually tested on both platforms.
