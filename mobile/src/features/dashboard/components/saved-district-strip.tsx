import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';

import { Card, HStack, Icon, Pressable, Skeleton, Text, VStack } from '@/components/atoms';
import { useDistricts } from '@/features/areas';
import { useAreaWeather } from '@/features/weather';
import { localise } from '@/lib/format';
import { useLanguage } from '@/stores';
import { useTheme } from '@/theme';

/**
 * One followed district, with its current temperature.
 *
 * Extracted into its own component so each card owns its own weather query. A parent that
 * fetched all of them would have to wait for the slowest before showing any, and a single
 * failing station would blank the whole strip.
 */
function SavedDistrictTile({ slug }: { slug: string }) {
  const router = useRouter();
  const language = useLanguage();

  const districts = useDistricts();
  const weather = useAreaWeather(slug);

  const district = districts.data?.find((d) => d.slug === slug);
  const name = district ? localise(district.name, language) : slug.replace(/-/g, ' ');
  const temperature = weather.data?.temperature;

  return (
    <Pressable
      onPress={() => router.push(`/districts/${slug}`)}
      accessibilityLabel={
        temperature ? `${name}, ${Math.round(temperature.value)} degrees` : name
      }
      style={{ minHeight: 0 }}
    >
      <Card padding="md" style={{ width: 140 }}>
        <VStack gap="xs">
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>

          {weather.isPending ? (
            <Skeleton width={54} height={26} />
          ) : temperature ? (
            <HStack align="center" gap="xs">
              <Icon name="thermometer-outline" size={15} tone="accent" />
              <Text variant="metric">{`${Math.round(temperature.value)}°`}</Text>
            </HStack>
          ) : (
            <Text variant="caption" color="textMuted">
              No station
            </Text>
          )}

          <Text variant="footnote" color="textMuted" numberOfLines={1}>
            {weather.data?.condition
              ? localise(weather.data.condition.label, language)
              : district?.division
                ? `${district.division} division`
                : ' '}
          </Text>
        </VStack>
      </Card>
    </Pressable>
  );
}

/** A horizontal strip of the districts the reader follows. */
export function SavedDistrictStrip({ slugs }: { slugs: string[] }) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // The strip sits inside a padded Screen, so it pulls its own edges out to let cards
      // scroll to the screen edge rather than stopping short of it.
      style={{ marginHorizontal: -theme.spacing.lg }}
      contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm }}
    >
      {slugs.map((slug) => (
        <SavedDistrictTile key={slug} slug={slug} />
      ))}
    </ScrollView>
  );
}
