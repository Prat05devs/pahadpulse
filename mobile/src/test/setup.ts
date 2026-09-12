/**
 * Jest setup, applied before every test file.
 *
 * Native modules are stubbed here rather than in each test: a component that happens to
 * render a haptic tap should not force its test to know that.
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

/**
 * Reanimated, stubbed.
 *
 * jest-expo's preset does NOT cover this: importing the real module pulls in
 * `react-native-worklets`, which reaches for a native module that does not exist under Jest
 * and throws `Cannot read properties of undefined (reading 'loadUnpackers')` before a single
 * test runs. Any component using an animated primitive would take its whole suite down.
 *
 * The library's own `mock.js` cannot be used: it re-imports the real module and hits the same
 * native initialiser. `src/test/reanimated-mock.tsx` covers the surface this app uses and
 * resolves every animation instantly — which is what a test should assert against anyway:
 * the final state, not a frame partway through a spring.
 */
jest.mock('react-native-reanimated', () => require('./reanimated-mock'));

// The env module throws on invalid configuration by design, so tests get a valid one.
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api';
process.env.EXPO_PUBLIC_WEB_URL = 'https://pahadpulse.in';
