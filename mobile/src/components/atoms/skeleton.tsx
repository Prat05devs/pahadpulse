import { useEffect, useState } from 'react';
import { Animated, Easing, View, type DimensionValue } from 'react-native';

import { useTheme, type RadiusToken } from '@/theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: RadiusToken;
};

/**
 * A loading placeholder shaped like the thing it replaces.
 *
 * Uses React Native's own `Animated` with `useNativeDriver`, not Reanimated. The animation is
 * a single opacity loop, which the native driver runs off the JS thread just as well — and
 * that matters here, because a skeleton is on screen exactly when the JS thread is busy
 * parsing the response it is waiting for. Staying off Reanimated also keeps this component
 * renderable under Jest without native worklets.
 */
export function Skeleton({ width = '100%', height = 16, radius = 'sm' }: SkeletonProps) {
  const theme = useTheme();
  /**
   * A lazy `useState` initialiser, not `useRef(...).current`.
   *
   * Both give one stable Animated.Value for the component's life, but reading `.current`
   * during render is a genuine React 19 violation — the value is created as a side effect of
   * rendering. The initialiser form says the same thing without that.
   */
  const [opacity] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    // Stopped on unmount: a loop left running holds the component alive and keeps the
    // native driver ticking for a view nobody can see.
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        opacity,
        borderRadius: theme.radius[radius],
        backgroundColor: theme.colors.skeleton,
      }}
    />
  );
}

/** Several skeleton lines, with the last one short so it reads as a paragraph. */
export function SkeletonLines({ count = 3 }: { count?: number }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} width={index === count - 1 ? '60%' : '100%'} height={14} />
      ))}
    </View>
  );
}
