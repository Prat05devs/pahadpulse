import { memo } from 'react';

import { Card, HStack, Icon, Pressable, Text, VStack } from '@/components/atoms';
import { formatCompact, localise } from '@/lib/format';
import { useIsDistrictSaved, useLanguage, usePreferencesStore } from '@/stores';
import { useTheme } from '@/theme';

import type { DistrictSummary } from '../schemas';

type DistrictCardProps = {
  district: DistrictSummary;
  /**
   * Takes the slug rather than closing over it, so the list can pass ONE stable handler to
   * every row. An inline `() => push(slug)` is a new function per render, which defeats the
   * memo below and re-renders all thirteen rows whenever the search box changes (P3).
   */
  onPress: (slug: string) => void;
};

/** A district in the list, with a follow toggle. */
export const DistrictCard = memo(function DistrictCard({
  district,
  onPress,
}: DistrictCardProps) {
  const theme = useTheme();
  const language = useLanguage();
  const isSaved = useIsDistrictSaved(district.slug);
  const toggleSaved = usePreferencesStore((s) => s.toggleSavedDistrict);

  const name = localise(district.name, language);
  const headquarters = district.headquarters
    ? localise(district.headquarters, language)
    : null;

  return (
    <Pressable
      onPress={() => onPress(district.slug)}
      accessibilityLabel={`${name} district`}
      style={{ minHeight: 0 }}
    >
      <Card padding="md">
        <HStack align="center" gap="md">
          <VStack grow gap="xxs">
            <Text variant="heading" numberOfLines={1}>
              {name}
            </Text>

            <HStack align="center" gap="xs" wrap>
              {headquarters ? (
                <Text variant="caption" color="textMuted" numberOfLines={1}>
                  {headquarters}
                </Text>
              ) : null}
              {district.division ? (
                <>
                  <Text variant="caption" color="textMuted">
                    ·
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {district.division}
                  </Text>
                </>
              ) : null}
            </HStack>

            <Text variant="footnote" color="textMuted">
              {`${formatCompact(district.counts.tehsils)} tehsils · ${formatCompact(district.counts.villages)} villages`}
            </Text>
          </VStack>

          <Pressable
            onPress={() => toggleSaved(district.slug)}
            haptic
            accessibilityRole="button"
            accessibilityState={{ selected: isSaved }}
            accessibilityLabel={isSaved ? `Unfollow ${name}` : `Follow ${name}`}
            style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={isSaved ? theme.colors.primary : theme.colors.textMuted}
            />
          </Pressable>

          <Icon name="chevron-forward" size={16} tone="textMuted" />
        </HStack>
      </Card>
    </Pressable>
  );
});
