import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

type LiveDotProps = {
  /** `danger` while something is in force, `fresh` when the feed is merely current. */
  tone?: 'fresh' | 'danger' | 'primary';
  size?: number;
  /** Stops the pulse. Use when the data is stale — a still dot says so without words. */
  active?: boolean;
};

/**
 * A dot that breathes, with a halo that expands out of it.
 *
 * This is the app's one ambient animation: it runs without anybody touching anything, which
 * is precisely what makes a screen feel connected to something rather than printed. It is
 * used only where the claim is true — beside data that really is being kept current — because
 * a pulse next to a stale figure is a lie told smoothly.
 *
 * The halo and the core are separate views so the halo can grow past the dot without the
 * dot itself changing size, which would shift the text beside it.
 */
export function LiveDot({ tone = 'fresh', size = 8, active = true }: LiveDotProps) {
  const theme = useTheme();
  const halo = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(halo);
      halo.set(0);
      return;
    }

    halo.set(
      withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }),
        // A pause at rest, so it reads as a heartbeat rather than a throb.
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: 600 }),
      ),
        -1,
        false,
      ),
    );

    // Cancelled on unmount: a repeat left running keeps the UI thread animating a view
    // nobody can see.
    return () => cancelAnimation(halo);
  }, [active, halo]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: (1 - halo.get()) * 0.45,
    transform: [{ scale: 1 + halo.get() * 1.9 }],
  }));

  const color =
    tone === 'danger'
      ? theme.colors.danger
      : tone === 'primary'
        ? theme.colors.primary
        : theme.colors.freshness.fresh;

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          haloStyle,
        ]}
      />
      <View
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }}
      />
    </View>
  );
}
