import type { ReactNode } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

/**
 * How far apart consecutive rows arrive.
 *
 * 45ms is the useful window: below about 30 the rows read as one block and the stagger is
 * wasted, above about 70 the last row of a full screen is still arriving after the reader has
 * started looking at it, which feels slow rather than considered.
 */
const STEP_MS = 45;

/** After this many rows the delay stops growing. */
const MAX_STEPS = 6;

type EntranceProps = {
  children: ReactNode;
  /** Position in the list. Later items arrive later, up to a cap. */
  index?: number;
};

/**
 * Content that arrives rather than appears.
 *
 * Deliberately a mount animation, not a scroll-linked one: this fires once, when data lands,
 * which is the moment worth marking. Rows that re-animate every time they scroll back into
 * view are the thing that makes an app feel busy instead of alive, and they fight the list
 * recycler.
 *
 * The delay is capped so a long list does not accumulate a visible wait at the bottom, and
 * the whole thing is a no-op under Jest, where jest-expo stubs Reanimated's native side.
 */
export function Entrance({ children, index = 0 }: EntranceProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(320)
        .delay(Math.min(index, MAX_STEPS) * STEP_MS)
        // Starts slightly low and rises: the direction reads as content settling into place.
        .withInitialValues({ transform: [{ translateY: 14 }] })}
    >
      {children}
    </Animated.View>
  );
}
