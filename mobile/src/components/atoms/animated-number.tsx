import { useEffect, useRef, useState } from 'react';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text, type TextProps } from './text';

type AnimatedNumberProps = Omit<TextProps, 'children'> & {
  value: number;
  /** Formats each intermediate step. Defaults to a plain integer. */
  format?: (value: number) => string;
  durationMs?: number;
};

/**
 * A number that counts up to its value instead of appearing at it.
 *
 * Why it earns its place: the counters on the home screen are the first thing anyone reads,
 * and a figure that arrives already settled gives no sense that it was just fetched. Counting
 * up says "this was measured", and it draws the eye to the number that changed.
 *
 * It animates a shared value and formats on the JS thread rather than driving the text
 * natively, because the text has to pass through `formatNumber` for Indian digit grouping —
 * a worklet cannot call `Intl`. The cost is one setState per frame for well under a second,
 * on at most a handful of counters.
 */
export function AnimatedNumber({
  value,
  format = (next) => String(Math.round(next)),
  durationMs = 650,
  ...textProps
}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState(() => format(value));
  const formatRef = useRef(format);

  useEffect(() => {
    formatRef.current = format;
  }, [format]);

  useEffect(() => {
    if (reduceMotion) {
      progress.set(value);
      setDisplay(formatRef.current(value));
      return;
    }

    progress.set(0);
    progress.set(
      withTiming(value, {
        duration: durationMs,
        // Decelerating: fast enough to feel immediate, settling rather than stopping dead.
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [value, durationMs, progress, reduceMotion]);

  const updateDisplay = (current: number) => {
    setDisplay(formatRef.current(current));
  };

  useAnimatedReaction(
    () => progress.get(),
    (current) => {
      runOnJS(updateDisplay)(current);
    },
    [updateDisplay],
  );

  return (
    <Text {...textProps} tabular>
      {display}
    </Text>
  );
}
