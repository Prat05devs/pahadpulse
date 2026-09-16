import { Link, Stack } from 'expo-router';

import { Text, VStack } from '@/components/atoms';
import { EmptyState } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useT } from '@/i18n';

export default function NotFoundRoute() {
  const t = useT();

  return (
    <Screen>
      <Stack.Screen options={{ title: t('nav.notFound') }} />
      <VStack gap="md" align="center">
        <EmptyState
          title={t('notFound.title')}
          message={t('notFound.message')}
          icon="compass-outline"
        />
        <Link href="/" accessibilityLabel={t('notFound.goHome')}>
          <Text variant="bodyStrong" color="primary">
            {t('notFound.goToToday')}
          </Text>
        </Link>
      </VStack>
    </Screen>
  );
}
