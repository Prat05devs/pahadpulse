import { Link, Stack } from 'expo-router';

import { Text, VStack } from '@/components/atoms';
import { EmptyState } from '@/components/molecules';
import { Screen } from '@/components/templates';

export default function NotFoundRoute() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Not found' }} />
      <VStack gap="md" align="center">
        <EmptyState
          title="That page does not exist"
          message="The link may be out of date."
          icon="compass-outline"
        />
        <Link href="/" accessibilityLabel="Go to the home screen">
          <Text variant="bodyStrong" color="primary">
            Go to Today
          </Text>
        </Link>
      </VStack>
    </Screen>
  );
}
