import { useRouter } from 'expo-router';

import { Card, Eyebrow, HStack, Icon, Pressable, Text, VStack } from '@/components/atoms';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

export function AssistantLaunchCard() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();

  return (
    <Pressable
      onPress={() => router.push('/assistant')}
      accessibilityLabel={t('assistant.launch.title')}
      accessibilityHint={t('assistant.launch.subtitle')}
    >
      <Card tone="primary" elevation="none" style={{ paddingVertical: theme.spacing.md }}>
        <HStack align="center" gap="md">
          <VStack
            align="center"
            justify="center"
            style={{
              width: 48,
              height: 48,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.primaryMuted,
            }}
          >
            <Icon name="chatbubble-ellipses-outline" size={24} tone="primary" />
          </VStack>
          <VStack grow gap="xxs">
            <Eyebrow color="primary">{t('assistant.launch.eyebrow')}</Eyebrow>
            <Text variant="bodyStrong">{t('assistant.launch.title')}</Text>
            <Text variant="caption" color="textSecondary">
              {t('assistant.launch.subtitle')}
            </Text>
          </VStack>
          <Icon name="chevron-forward" size={20} tone="primary" />
        </HStack>
      </Card>
    </Pressable>
  );
}
