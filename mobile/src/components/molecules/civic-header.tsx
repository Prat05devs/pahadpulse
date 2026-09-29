import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow, HStack, LiveDot, Text, VStack } from '@/components/atoms';
import { useTheme } from '@/theme';

type CivicHeaderProps = {
  title: string;
  eyebrow: string;
  subtitle?: string;
  /** A pulsing dot is reserved for a feed that has answered during this session. */
  live?: boolean;
  urgent?: boolean;
  showStatusDot?: boolean;
  children?: ReactNode;
};

/**
 * The compact public-service masthead shared by the data-heavy tab screens.
 *
 * It keeps identity and feed state in one predictable place, while `children` gives each
 * feature room for its own primary controls (usually filters or search). The header owns the
 * status-bar inset because tab routes do not receive a native navigation header.
 */
export function CivicHeader({
  title,
  eyebrow,
  subtitle,
  live = false,
  urgent = false,
  showStatusDot = true,
  children,
}: CivicHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top + theme.spacing.xs,
        paddingBottom: theme.spacing.md,
        backgroundColor: theme.colors.background,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.separator,
        gap: theme.spacing.md,
      }}
    >
      <HStack paddingX="lg" gap="md" align="center">
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.brandCanvas,
            borderWidth: 1,
            borderColor: theme.colors.borderSubtle,
          }}
        >
          <Image
            source={require('@/assets/images/logo.png')}
            style={{ width: 34, height: 34 }}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
        </View>

        <VStack grow gap="xxs" accessible accessibilityRole="header">
          <HStack gap="xs" align="center">
            {showStatusDot ? (
              <LiveDot tone={urgent ? 'danger' : 'fresh'} size={7} active={live} />
            ) : null}
            <Eyebrow color={urgent ? 'danger' : live ? 'success' : 'textMuted'}>
              {eyebrow}
            </Eyebrow>
          </HStack>
          <Text variant="title" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="textMuted" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </VStack>
      </HStack>

      {children}
    </View>
  );
}
