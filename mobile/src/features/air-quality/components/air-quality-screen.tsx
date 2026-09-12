import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Text, VStack } from '@/components/atoms';
import { Screen } from '@/components/templates';
import { useTheme } from '@/theme';

export function AirQualityScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const header = (
    <View
      style={{
        paddingTop: insets.top + theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <Text variant="title">Air Quality</Text>
    </View>
  );

  return (
    <Screen header={header}>
      <VStack gap="sm">
        <Card padding="md">
          <Text variant="body">Air quality data is currently accessed from individual district pages.</Text>
        </Card>
      </VStack>
    </Screen>
  );
}
