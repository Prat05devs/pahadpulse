# Mobile — 06 Data, Offline & Storage

`frontend/05-state-and-data-fetching.md` applies in full — same TanStack Query rules, same key
factories, same staleness discipline. This file covers what mobile adds: persistence, offline,
and secure storage.

---

## 1. Query client with persistence

```ts
// lib/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME.FEED,
      gcTime: 24 * 60 * 60 * 1000,          // 24h — survives an app restart
      retry: (failureCount, error) =>
        isRequestError(error) && error.statusCode >= 500 && failureCount < 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      networkMode: 'offlineFirst',           // serve cache, don't error immediately
    },
    mutations: { networkMode: 'offlineFirst', retry: 0 },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  throttleTime: 1000,
});
```

```tsx
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister,
    maxAge: 24 * 60 * 60 * 1000,
    buster: env.EXPO_PUBLIC_APP_VERSION,     // invalidates the cache on app upgrade
    dehydrateOptions: {
      // never persist authenticated or sensitive queries
      shouldDehydrateQuery: (query) => query.state.status === 'success' && !query.meta?.sensitive,
    },
  }}
>
```

**Differences from web that matter:**

| Setting | Web | Mobile | Why |
|---|---|---|---|
| `gcTime` | 1h | 24h | cache must survive app restarts |
| `networkMode` | `online` | `offlineFirst` | serve cached data instead of erroring |
| retries | 2 | 3, exponential | mobile networks fail transiently |
| persistence | none | AsyncStorage | offline cold start |
| `buster` | n/a | app version | prevents a stale cache with an old schema |

Mark sensitive queries so they are never written to disk:

```ts
useQuery({ queryKey: userKeys.me(), queryFn: fetchMe, meta: { sensitive: true } });
```

---

## 2. Online/offline and focus wiring

```ts
// app/_layout.tsx (once, at startup)
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(Boolean(state.isConnected))),
);

AppState.addEventListener('change', (status) => focusManager.setFocused(status === 'active'));
```

Without this, TanStack Query assumes it is always online and never refetches on resume — the
two most common mobile data bugs.

---

## 3. Offline behaviour matrix

Decide this **per module, in its doc**. Do not leave it to chance.

| Scenario | Behaviour |
|---|---|
| Offline, data cached | render cached data + persistent offline banner |
| Offline, no cache | `<OfflineState onRetry />` |
| Offline, user reads | works from cache |
| Offline, user mutates (queueable) | optimistic update + "will sync" indicator + queue |
| Offline, user mutates (not queueable) | disable the action with an explanatory message |
| Reconnect | resume paused mutations, then refetch stale queries |
| Conflict on sync | server wins by default; surface a message if the user's change was dropped |

```tsx
export function OfflineBanner() {
  const isOnline = useNetworkStatus();
  if (isOnline) return null;
  return (
    <View accessibilityLiveRegion="polite" className="bg-muted px-4 py-2">
      <Text className="text-center text-xs text-muted-foreground">
        You're offline — showing saved content
      </Text>
    </View>
  );
}
```

**Not everything should be queueable.** Publishing an article, making a payment, or deleting
an account should be blocked offline rather than optimistically queued. Queue only operations
that are safe to replay late: drafts, favourites, read-state, analytics.

---

## 4. Offline mutation queue

```ts
queryClient.setMutationDefaults(['article', 'saveDraft'], {
  mutationFn: saveDraft,
  retry: 3,
  onMutate: async (draft) => {
    await queryClient.cancelQueries({ queryKey: articleKeys.draft(draft.id) });
    const previous = queryClient.getQueryData(articleKeys.draft(draft.id));
    queryClient.setQueryData(articleKeys.draft(draft.id), draft);
    return { previous };
  },
  onError: (_e, draft, ctx) => queryClient.setQueryData(articleKeys.draft(draft.id), ctx?.previous),
  onSettled: (_d, _e, draft) => queryClient.invalidateQueries({ queryKey: articleKeys.draft(draft.id) }),
});

// on reconnect
onlineManager.subscribe((isOnline) => {
  if (isOnline) void queryClient.resumePausedMutations();
});
```

Requirements: mutation defaults must be registered at startup (so a rehydrated paused mutation
knows its function); the server endpoint should accept an `Idempotency-Key` so a replayed
mutation doesn't double-apply; the UI must show which items are pending sync; and a permanently
failing mutation must be surfaced and removable, not retried forever.

---

## 5. Storage tiers

| Tier | Library | Use for | Never |
|---|---|---|---|
| Secure | `expo-secure-store` | access token, refresh token, PII | large data (there are size limits) |
| Persistent | `AsyncStorage` | query cache, preferences, onboarding flags | tokens, secrets |
| Files | `expo-file-system` | downloaded media, exports | secrets |
| Memory | React state | ephemeral UI | anything that must survive a restart |

**Tokens in `AsyncStorage` is a blocking review comment.** It is unencrypted and readable on a
compromised device.

All access goes through `lib/storage.ts` — never call the SDKs directly from a feature. Every
read is Zod-parsed, because a value written by a previous app version can be any shape:

```ts
export async function getPreferences(): Promise<Preferences> {
  const raw = await AsyncStorage.getItem(KEYS.preferences);
  if (raw === null) return DEFAULT_PREFERENCES;
  const parsed = PreferencesSchema.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : DEFAULT_PREFERENCES;   // never crash on bad stored data
}
```

Storage keys are namespaced constants (`auth.accessToken`, `prefs.theme`) in one file, and are
versioned when their shape changes (`prefs.v2`).

---

## 6. Session lifecycle

```
Cold start
  → read tokens from SecureStore
  → if access token valid: session restored
  → else if refresh token present: refresh silently
  → else: no session
  → hide splash
```

- Access token in memory (and SecureStore for restore); refresh token in SecureStore only.
- The API client refreshes on 401 **once**, deduplicating concurrent refreshes so ten parallel
  401s trigger one refresh, not ten.
- On refresh failure: clear SecureStore, `queryClient.clear()`, redirect to login.
- On logout: clear SecureStore, `queryClient.clear()`, **and** purge the persisted cache —
  otherwise the next user sees the previous user's data after an app restart.

```ts
export async function signOut(): Promise<void> {
  await secureStorage.clear();
  queryClient.clear();
  await persister.removeClient();
  router.replace(ROUTES.login);
}
```

---

## 7. Background refresh and timeouts

- Refetch stale queries when the app becomes active (handled by `focusManager`).
- Don't refetch everything on every foreground — that is what `staleTime` is for.
- Every request has a timeout; mobile networks hang rather than fail.
  - **JSON requests:** fixed 10 s.
  - **Uploads and downloads:** an **idle** timeout (abort after ~15 s of zero progress), never
    a fixed total duration — on mobile you control neither the file size nor the bandwidth, so
    a wall-clock cap fails legitimate transfers on a weak connection. `expo-file-system`'s
    `createUploadTask` exposes a progress callback; reset the timer on every progress event.
    Rationale and the fallback formula: [backend/10-performance-and-caching.md](../backend/10-performance-and-caching.md) §7.
- Background tasks (`expo-background-fetch`) only when a real requirement demands them — they are
  unreliable on iOS and drain battery.

---

## 8. Data usage and battery

- Request appropriately-sized images; never download originals for thumbnails.
- Paginate everything; never fetch an unbounded list.
- Debounce search before it becomes a query key.
- No polling. If the product needs live data, use push notifications or SSE, and stop when
  backgrounded.
- Cache aggressively — the cheapest request is the one you don't make.

---

## 9. Checklist

- [ ] Query cache persisted to AsyncStorage with `buster` set to the app version.
- [ ] Sensitive queries excluded from persistence.
- [ ] `onlineManager` and `focusManager` wired to NetInfo and AppState.
- [ ] `networkMode: 'offlineFirst'`; retries exponential and bounded.
- [ ] Offline behaviour decided per module and documented in its doc.
- [ ] Offline banner shown when serving cached data.
- [ ] Only safely-replayable mutations are queued; others are blocked offline.
- [ ] Mutation defaults registered at startup; server supports idempotency keys.
- [ ] Tokens only in SecureStore; all storage access via `lib/storage.ts`.
- [ ] Every stored value Zod-parsed on read, with a safe default.
- [ ] Logout clears SecureStore, the query cache, **and** the persisted cache.
- [ ] Every request has a timeout.
