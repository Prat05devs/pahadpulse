import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Badge, Card, HStack, Icon, Text, VStack } from '@/components/atoms';
import { ActionButton } from '@/components/molecules';
import { useT } from '@/i18n';
import { openDirections, openExternal } from '@/lib/external-link';
import { useTheme } from '@/theme';

import type { TourismGuide } from '../pilgrim-schemas';

type GuidePlace = TourismGuide['pilgrimages'][number];

/**
 * One pilgrimage place or destination from the guide: photo, what it is, and the three
 * things a traveller does next - get directions, read the official page, check conditions.
 */
export function PlaceCard({ place }: { place: GuidePlace }) {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <Image
        source={{ uri: place.imageUrl }}
        style={{ width: '100%', height: 150, backgroundColor: theme.colors.surfaceMuted }}
        contentFit="cover"
        transition={200}
        accessibilityLabel={`${place.name}, Uttarakhand`}
      />
      <VStack gap="xs" padding="md">
        <Badge label={place.category} tone="primary" />
        <Text variant="heading">{place.name}</Text>
        <HStack gap="xxs" align="center">
          <Icon name="location-outline" size={14} tone="textMuted" />
          <Text variant="caption" color="textMuted">
            {place.district}
          </Text>
        </HStack>
        <Text variant="caption">{place.summary}</Text>
        <View style={{ height: theme.spacing.xs }} />
        <HStack gap="xs" wrap>
          <ActionButton
            label={t('guide.checkConditions')}
            icon="calendar-outline"
            tone="primary"
            onPress={() => router.push({ pathname: '/trip-check', params: { to: place.slug } })}
          />
          <ActionButton
            label={t('guide.directions')}
            icon="navigate-outline"
            onPress={() => void openDirections(place.mapDestination)}
          />
          <ActionButton
            label={t('guide.officialPage')}
            icon="open-outline"
            onPress={() => void openExternal(place.officialUrl)}
          />
        </HStack>
      </VStack>
    </Card>
  );
}
