# Mobile — 00 Read This First

The mobile app is **Expo + React Native + TypeScript + Expo Router + NativeWind**, and it is
deliberately the *same architecture* as the web app.

## The reuse rule

> **Everything in `guidelines/frontend/` applies to mobile unless a mobile file says otherwise.**

React is React. Feature slicing, TanStack Query, Zod at the boundary, the four render states,
the error model, hook rules, testing philosophy, code-quality limits — all identical. An
engineer moving from web to mobile should recognise the codebase immediately.

| Web guideline | Mobile status |
|---|---|
| `frontend/01-folder-structure.md` | see `mobile/01` — same tree, `app/` is Expo Router |
| `frontend/02-high-level-design.md` | see `mobile/02` — no server components; add offline/lifecycle |
| `frontend/03-low-level-design.md` | **applies as-is**, plus `mobile/03` for RN specifics |
| `frontend/04-ui-and-design-system.md` | see `mobile/04` — NativeWind, same tokens |
| `frontend/05-state-and-data-fetching.md` | **applies as-is**, plus `mobile/06` for offline/persistence |
| `frontend/06-forms-and-validation.md` | **applies as-is** (RHF + Zod), RN input components |
| `frontend/07-code-quality.md` | **applies as-is**, plus `mobile/07` deltas |
| `frontend/08-testing.md` | see `mobile/08` — RNTL instead of RTL, Maestro instead of Cypress |
| `frontend/09-storybook.md` | optional on mobile; see `mobile/08` |
| `frontend/10-performance-and-seo.md` | see `mobile/09` — no SEO; different perf levers |
| `frontend/11-accessibility.md` | see `mobile/10` — same principles, RN a11y props |

## What is genuinely different

1. **No server components, no SSR.** Everything is client-side. TanStack Query does more work.
2. **The network is unreliable.** Offline handling, cache persistence, and retry policy are
   first-class requirements, not enhancements.
3. **The app has a lifecycle.** Background, foreground, cold start, deep link, push
   notification. State must survive all of them.
4. **Secure storage matters.** Tokens go in the Keychain/Keystore, never `AsyncStorage`.
5. **Two platforms.** iOS and Android differ in navigation gestures, safe areas, permissions,
   keyboard behaviour, and back-button semantics.
6. **You cannot force an upgrade.** Old app versions stay in the wild for months, so the API
   contract must be backward-compatible forever, or version-gated.
7. **Release takes days.** App-store review means a bug is expensive. OTA updates
   (EAS Update) mitigate JS-only fixes.
8. **Lists are the performance bottleneck**, not bundle size.

## Files in this folder

| File | Covers |
|---|---|
| `01-folder-structure.md` | project tree, Expo Router conventions |
| `02-high-level-design.md` | architecture, lifecycle, offline model |
| `03-low-level-design.md` | RN component/screen/hook skeletons |
| `04-ui-and-design-system.md` | NativeWind, shared tokens, RN primitives |
| `05-navigation.md` | Expo Router, deep links, auth-gated routes |
| `06-data-offline-and-storage.md` | persistence, offline queue, secure storage |
| `07-code-quality.md` | RN-specific rules and anti-patterns |
| `08-testing.md` | RNTL, MSW, Maestro |
| `09-performance.md` | lists, images, re-renders, startup |
| `10-accessibility.md` | RN a11y props, VoiceOver/TalkBack |
| `11-build-and-release.md` | EAS Build/Submit/Update, versioning, store process |
