import * as Haptics from 'expo-haptics';
import { useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { HIT_SLOP_MIN_SIZE } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

/**
 * The press spring.
 *
 * Tuned to settle rather than wobble: `damping` high enough that the control does not
 * oscillate under a fast double tap, and stiff enough that the scale is finished before the
 * navigation it triggered begins. A springy control that is still moving after the screen has
 * changed reads as lag, not polish.
 */
const PRESS_SPRING = { damping: 18, stiffness: 320, mass: 0.5 } as const;

/** Barely visible on its own, unmistakable in aggregate. 3% is the whole effect. */
const PRESS_SCALE = 0.97;

export type PressableProps = Omit<RNPressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  /** Applied while the finger is down, on top of `style`. */
  pressedStyle?: StyleProp<ViewStyle>;
  /** Fire a light haptic tap. Reserve it for committing actions, not for navigation. */
  haptic?: boolean;
  children?: ReactNode;
};

/**
 * The app's tappable primitive.
 *
 * It exists to make two things automatic that are easy to forget per call site: a touch
 * target that reaches the 44pt minimum even when the visible control is smaller, and an
 * Android ripple that matches the platform.
 */
export function Pressable({
  style,
  pressedStyle,
  haptic,
  onPress,
  hitSlop,
  accessibilityRole = 'button',
  children,
  ...rest
}: PressableProps) {
  const scale = useSharedValue(1);
  const dim = useSharedValue(1);
  /*
   * `pressedStyle` is applied from React state rather than RN's `({ pressed }) => …` style
   * function, because a function style cannot carry a Reanimated style alongside it. One
   * state update per press is far cheaper than the alternative, and it keeps the existing
   * `pressedStyle` API working for the callers that pass one.
   */
  const [isPressed, setIsPressed] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
    opacity: dim.get(),
  }));

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      hitSlop={hitSlop ?? 8}
      android_ripple={{ borderless: false }}
      onPressIn={(event) => {
        setIsPressed(true);
        scale.set(withSpring(PRESS_SCALE, PRESS_SPRING));
        // Only dim when the caller has not supplied its own pressed treatment, so the two
        // do not stack into something much darker than either intended.
        if (pressedStyle === undefined) dim.set(withTiming(0.72, { duration: 90 }));
        rest.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setIsPressed(false);
        scale.set(withSpring(1, PRESS_SPRING));
        dim.set(withTiming(1, { duration: 140 }));
        rest.onPressOut?.(event);
      }}
      onPress={(event) => {
        if (haptic && Platform.OS !== 'web') {
          // Fire and forget: a failed haptic must never block the action it accompanies.
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.(event);
      }}
      style={[
        { minHeight: HIT_SLOP_MIN_SIZE },
        style,
        isPressed && pressedStyle,
        animatedStyle,
      ]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
