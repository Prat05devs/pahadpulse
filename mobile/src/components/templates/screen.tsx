import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  /** Wire this to `refetch` to enable pull-to-refresh. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Turn off scrolling for a screen that hosts its own list. */
  scroll?: boolean;
  /** Pinned above the scrolling content — a title bar or a filter row. */
  header?: ReactNode;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
};

/**
 * The page frame every screen sits in.
 *
 * It owns three things that are wrong somewhere in every app that leaves them to the screen:
 * the safe-area inset at the bottom, the themed background behind the content, and
 * pull-to-refresh. Centralising them means a new screen gets all three by default.
 */
export function Screen({
  children,
  onRefresh,
  refreshing = false,
  scroll = true,
  header,
  contentContainerStyle,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  /**
   * The tab bar floats over the content, so the last card would otherwise sit underneath it.
   * The inset is added to a fixed allowance rather than replacing it, because on a device
   * with no home indicator `insets.bottom` is 0 and the bar still occupies space.
   */
  const bottomPadding = insets.bottom + theme.spacing.xxxl;

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: bottomPadding },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      // Lets a reader dismiss the keyboard by scrolling, rather than hunting for Done.
      keyboardDismissMode="on-drag"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1 }}>{children}</View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {header}
      {body}
    </View>
  );
}
