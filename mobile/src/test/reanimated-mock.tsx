import { View } from 'react-native';

/**
 * A hand-written Reanimated stub, covering exactly the surface this app uses.
 *
 * Why not the library's own `react-native-reanimated/mock`: it re-imports the real module,
 * which initialises `react-native-worklets` and reaches for a native module Jest does not
 * have — so it fails on import in precisely the situation it exists to rescue.
 *
 * Every animation resolves instantly to its target value. That is the right behaviour for a
 * test: assertions should be about the state the UI settles in, never about a frame partway
 * through a spring.
 */

const identity = (value: any): any => value;

const chainable = (): any => {
  const builder: any = {};
  for (const method of ['duration', 'delay', 'withInitialValues', 'springify', 'build']) {
    builder[method] = () => builder;
  }
  return builder;
};

export const FadeInDown = chainable();
export const FadeIn = chainable();
export const FadeOut = chainable();

export const withTiming = identity;
export const withSpring = identity;
export const withDelay = (_ms: number, value: any): any => value;
export const withSequence = (...values: any[]): any => values[values.length - 1];
export const withRepeat = identity;
export const cancelAnimation = (): void => {};
export const runOnJS =
  (fn: any) =>
  (...args: any[]): any =>
    fn(...args);

export const Easing = {
  ease: identity,
  linear: identity,
  cubic: identity,
  in: identity,
  out: identity,
  inOut: identity,
};

export function useSharedValue(initial: any): any {
  const box = {
    value: initial,
    get: () => box.value,
    set: (next: any) => {
      box.value = typeof next === 'function' ? next(box.value) : next;
    },
  };
  return box;
}

export function useAnimatedStyle(factory: () => any): any {
  return factory();
}

export function useAnimatedReaction(prepare: () => any, react: (value: any) => void): void {
  react(prepare());
}

function createAnimatedComponent(Component: any): any {
  return Component;
}

const Animated = {
  View,
  Text: View,
  ScrollView: View,
  createAnimatedComponent,
};

export default Animated;
export { createAnimatedComponent };
