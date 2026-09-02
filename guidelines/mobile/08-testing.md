# Mobile — 08 Testing

`frontend/08-testing.md` applies for philosophy, query priority, MSW, and factories. The
differences are the runner (`jest-expo`), the library (`@testing-library/react-native`), and
E2E (Maestro).

---

## 1. Test map

| Level | File | Under test | Network |
|---|---|---|---|
| Unit — component | `x.test.tsx` | one component, props in / tree out | none |
| Unit — hook | `use-x.test.ts` | one hook via `renderHook` | MSW |
| Unit — pure | `x.test.ts` | schemas, formatters, storage wrappers | none |
| Integration | `x.integration.test.tsx` | screen + real hook + real service | MSW |
| E2E | `e2e/*.yaml` | full journey on a simulator/device | real or stubbed API |

Same coverage bar as web (`common/09-testing-strategy.md`).

---

## 2. Configuration

```js
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-css-interop)',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/test/**', '!src/types/**'],
};
```

`transformIgnorePatterns` is the one that costs people an afternoon: RN libraries ship
untranspiled ESM and must be allowed through Babel. When a test fails with
`SyntaxError: Cannot use import statement outside a module`, add the package here.

```ts
// src/test/setup.ts
import '@testing-library/react-native/extend-expect';
import { server } from './mocks/server';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { server.resetHandlers(); jest.clearAllMocks(); });
afterAll(() => server.close());
```

---

## 3. Custom render

```tsx
// src/test/utils.tsx
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}
```

`SafeAreaProvider` with `initialMetrics` is required — without it, `SafeAreaView` renders
nothing in tests and every assertion mysteriously fails.

---

## 4. Component tests

```tsx
describe('ArticleCard', () => {
  it('renders the title', () => {
    renderWithProviders(<ArticleCard article={makeArticle({ title: 'Kedarnath reopens' })} />);
    expect(screen.getByText('Kedarnath reopens')).toBeOnTheScreen();
  });

  it('calls onPress with the article id', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    renderWithProviders(<ArticleCard article={makeArticle({ id: 42 })} onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: /article:/i }));

    expect(onPress).toHaveBeenCalledWith(42);
  });
});
```

Query priority on RN:

1. `getByRole(role, { name })` — requires `accessibilityRole` + label. **Preferred.**
2. `getByLabelText` — `accessibilityLabel`
3. `getByText`
4. `getByPlaceholderText`
5. `getByTestId` — last resort

As on web, if you can't query by role, that is usually a real accessibility gap. Fix the
component.

`user.press(...)` from `userEvent`, not `fireEvent.press` — it models the real gesture
sequence including timing.

---

## 5. Screen integration tests

```tsx
describe('ArticleDetailScreen', () => {
  it('renders the article from the API', async () => {
    server.use(http.get('*/articles/approved/42', () =>
      HttpResponse.json(successEnvelope(makeArticleDetail({ id: 42, title: 'Hello' })))));

    renderWithProviders(<ArticleDetailScreen articleId={42} />);

    expect(await screen.findByText('Hello')).toBeOnTheScreen();
  });

  it('shows the offline state when the request fails and there is no cache', async () => {
    server.use(http.get('*/articles/approved/42', () => HttpResponse.error()));

    renderWithProviders(<ArticleDetailScreen articleId={42} />);

    expect(await screen.findByText(/you're offline/i)).toBeOnTheScreen();
  });
});
```

Every screen gets tests for all five states: loading, error, empty, **offline**, success.

---

## 6. Testing platform-specific behaviour

```tsx
describe('on Android', () => {
  beforeEach(() => { Platform.OS = 'android'; });
  afterEach(() => { Platform.OS = 'ios'; });

  it('closes the editor on hardware back when there are no unsaved changes', () => { /* ... */ });
});
```

Test both branches of every `Platform.select` that affects behaviour (not merely styling).

---

## 7. Testing storage and session

```ts
it('returns the default preferences when stored data is malformed', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('{"theme":123}');

  const prefs = await getPreferences();

  expect(prefs).toEqual(DEFAULT_PREFERENCES);   // must not throw
});

it('clears secure storage and the query cache on sign out', async () => {
  await signOut();

  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth.accessToken');
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
});
```

Malformed-stored-data tests matter: an app upgrade that changes a stored shape must degrade,
never crash on launch.

---

## 8. E2E with Maestro

```yaml
# e2e/author-creates-article.yaml
appId: com.basictech.app
---
- launchApp:
    clearState: true
- tapOn: "Email"
- inputText: "author@example.com"
- tapOn: "Password"
- inputText: "correct-horse-battery"
- tapOn: "Sign in"
- assertVisible: "Home"
- tapOn: "Create"
- tapOn: "Title"
- inputText: "A test headline"
- tapOn: "Submit for review"
- assertVisible: "Submitted for review"
```

Flows to cover (keep the set small):

| Flow | Why |
|---|---|
| `login-and-logout.yaml` | the gate to everything |
| `browse-and-read-article.yaml` | the core read journey |
| `author-creates-article.yaml` | the core write journey |
| `deep-link-to-article.yaml` | cold start from a link |
| `offline-read.yaml` | cached read with the network off |

Rules: `clearState: true` for determinism; assert on visible text, not coordinates; run against
a seeded backend or a stubbed one; run in CI on the PR to `main`, on both an iOS simulator and
an Android emulator.

Deep-link testing is not optional:

```bash
npx uri-scheme open basictech://articles/42 --ios
npx uri-scheme open basictech://articles/42 --android
```

---

## 9. Manual test matrix

Automation cannot cover these. Required before any release:

| Dimension | Cases |
|---|---|
| Device | iPhone with notch, iPhone SE, mid-range Android, tall Android |
| OS | current and current-minus-one major |
| Orientation | portrait (landscape if supported) |
| Theme | light, dark |
| Font scale | default, 200% |
| Network | wifi, slow 3G, airplane mode, flapping |
| Lifecycle | cold start, background 10 min, background 24 h, force kill, low memory |
| Entry | app icon, deep link, push notification |
| Permissions | granted, denied, denied-forever |

---

## 10. Storybook on mobile

Optional. `@storybook/react-native` is heavier and less pleasant than the web version. Use it
when the project has a substantial shared component library; otherwise rely on RNTL tests plus
the manual matrix.

If a project ships both web and mobile with `react-native-web`, the **web** Storybook can host
shared components — which is usually the better trade.

---

## 11. Checklist

- [ ] `jest-expo` preset with correct `transformIgnorePatterns`.
- [ ] `SafeAreaProvider` with `initialMetrics` in the test wrapper.
- [ ] Fresh QueryClient per test, `retry: false`.
- [ ] MSW `onUnhandledRequest: 'error'`; envelopes mirror the real API.
- [ ] `expo-secure-store` and `expo-router` mocked in setup.
- [ ] Queries by role/label; `testID` only as a last resort.
- [ ] `userEvent.press`, never `fireEvent`.
- [ ] All five screen states tested, including offline.
- [ ] Malformed stored data degrades safely.
- [ ] Platform-specific behaviour tested for both platforms.
- [ ] Maestro flows for the critical journeys; deep links tested.
- [ ] Manual matrix completed before release.
