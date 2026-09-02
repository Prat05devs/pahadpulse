# Mobile — 07 Code Quality

`frontend/07-code-quality.md` applies in full. This file lists the React Native deltas.

---

## 1. ESLint additions

```js
// eslint.config.mjs
import reactNative from 'eslint-plugin-react-native';

export default [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-native': reactNative },
    rules: {
      'react-native/no-inline-styles': 'error',
      'react-native/no-unused-styles': 'error',
      'react-native/no-raw-text': ['error', { skip: ['Button'] }],
      'react-native/no-single-element-style-arrays': 'error',
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'react-native', importNames: ['Image'], message: 'Use expo-image.' },
          { name: 'react-native', importNames: ['TouchableOpacity', 'TouchableHighlight'], message: 'Use Pressable.' },
          { name: '@react-native-async-storage/async-storage', message: 'Use lib/storage.ts. Tokens go in SecureStore.' },
          { name: 'expo-secure-store', message: 'Use lib/storage.ts.' },
        ],
      }],
      'no-console': 'error',
    },
  },
  {
    files: ['app/**/*.tsx'],
    rules: { 'import/no-default-export': 'off' },   // Expo Router requires default exports
  },
];
```

`no-raw-text` catches the crash-on-render class of bug: a bare string outside `<Text>`.

Boundary zones are the same as web (`components/` must not import `features/`), plus a
restriction keeping direct storage SDK calls out of feature code.

---

## 2. React Native anti-patterns (blocking)

| Anti-pattern | Why | Instead |
|---|---|---|
| Bare string outside `<Text>` | runtime crash | wrap in `<Text>` |
| `ScrollView` + `.map()` for a long list | renders every row; jank and memory | `FlashList` |
| `key={index}` in a list | breaks recycling and state | stable entity ID |
| Inline arrow in `renderItem` with heavy JSX | new component identity every render | memoised row component |
| Inline `style={{ ... }}` | new object every render | NativeWind class or a `StyleSheet` constant |
| RN's `Image` | no caching, no placeholder | `expo-image` |
| `TouchableOpacity` | legacy | `Pressable` |
| Tokens in `AsyncStorage` | plaintext on disk | `expo-secure-store` |
| Direct `AsyncStorage`/`SecureStore` calls in a feature | unvalidated, unnamespaced | `lib/storage.ts` |
| Missing `SafeAreaView` | content under the notch | `SafeAreaView` with explicit edges |
| Fixed heights on text containers | breaks at large font scale | intrinsic sizing |
| No press feedback | feels broken | `active:opacity-*` / ripple |
| `Dimensions.get('window')` at module scope | wrong after rotation or on a foldable | `useWindowDimensions()` |
| Uncleaned `AppState`/`NetInfo`/timer subscription | leak, fires on unmounted components | return a cleanup function |
| Unvalidated route params | deep links deliver anything | Zod-parse |
| Heavy work on the JS thread | dropped frames | `InteractionManager`, worklets, or move it server-side |
| `console.log` shipped | leaks data, costs performance in release | remove |
| Animating layout properties | runs on the JS thread | animate `transform`/`opacity` with Reanimated |
| Conditional navigator trees for auth | loses state, breaks deep links | one tree + redirect |
| Platform fork by whole file for a trivial difference | duplicate code | `Platform.select` |

---

## 3. Component rules (deltas from web)

| # | Rule |
|---|---|
| M1 | Route files in `app/` default-export; everything else uses named exports. |
| M2 | Screens live in features as `<thing>-screen.tsx`, never in `app/`. |
| M3 | Every `<Text>` is styled explicitly — nothing inherits. |
| M4 | Every `Pressable` has `accessibilityRole` and an accessible name. |
| M5 | Every list row component is memoised and cheap. |
| M6 | `useWindowDimensions()` for responsive logic, never a module-scope `Dimensions.get`. |
| M7 | `numberOfLines` on any user-generated text. |
| M8 | Every screen handles safe areas; every screen with an input handles the keyboard. |

---

## 4. Performance-sensitive review points

- Is this list a `FlashList` with a correct `estimatedItemSize`?
- Is `renderItem` rendering a memoised component?
- Are images sized, cached, and requested at display resolution?
- Are animations on the UI thread (Reanimated worklets), not the JS thread?
- Does anything expensive run during render or during a gesture?
- Are there re-renders caused by a new object/array identity in a provider value?

See [09-performance.md](09-performance.md).

---

## 5. Platform parity checklist

Every feature is verified on **both** platforms before review:

- [ ] iOS with a notch and iOS without (SE)
- [ ] Android with gesture nav and with button nav
- [ ] Android hardware back behaves correctly
- [ ] Keyboard: opens, doesn't cover the focused input, dismisses correctly
- [ ] Safe areas correct in portrait (and landscape if supported)
- [ ] Dark mode correct on both
- [ ] Font scale 200% doesn't break layout
- [ ] Slow network and airplane mode behave per the offline matrix
- [ ] Deep link opens the screen with no stack behind it

"Works on my simulator" is not a verification.

---

## 6. Definition of Done (mobile)

Everything in [common/08-code-quality.md](../common/08-code-quality.md) §1, plus:

- [ ] Verified on a real iOS device **and** a real Android device.
- [ ] Offline behaviour matches the module doc.
- [ ] Deep link tested via `uri-scheme`.
- [ ] Lifecycle tested: cold start, background/resume, kill and relaunch.
- [ ] No new native dependency without a logged decision (it forces a store build).
- [ ] Accessibility labels present; VoiceOver/TalkBack pass on the new screen.
- [ ] Bundle impact considered for any new library.
- [ ] Change is OTA-safe, or the plan says a store build is required.
