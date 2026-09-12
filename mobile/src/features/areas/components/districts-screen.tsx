import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Entrance, Text, VStack } from '@/components/atoms';
import { EmptyState, ErrorState, LoadingState } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { DISTRICT_COUNT } from '@/config/constants';
import { useTheme } from '@/theme';
import { familyFor } from '@/theme/fonts';

import { useDistrictList } from '../hooks';
import { DistrictCard } from './district-card';

/**
 * Every district, searchable, with followed ones pinned to the top.
 *
 * A `FlatList` rather than a `ScrollView` even at thirteen rows: the list is the pattern a
 * future tehsil or village list will copy, and thirteen is only small until villages arrive.
 */
export function DistrictsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  // One stable handler for every row, so DistrictCard's memo actually holds.
  const openDistrict = useCallback(
    (slug: string) => router.push(`/districts/${slug}`),
    [router],
  );

  const { districts, isPending, isError, error, refetch, isRefetching } =
    useDistrictList(search);

  const header = (
    <View
      style={{
        // This tab has no navigation header, so the screen itself owns the status-bar
        // inset. Without it the search field renders underneath the clock.
        paddingTop: insets.top + theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={`Search ${DISTRICT_COUNT} districts`}
        placeholderTextColor={theme.colors.textMuted}
        autoCorrect={false}
        clearButtonMode="while-editing"
        accessibilityLabel="Search districts"
        style={{
          height: 44,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          color: theme.colors.text,
          // The search field is a raw TextInput, so it has to name its font explicitly —
          // it is the one place the Text atom cannot do it for us.
          fontFamily: familyFor(search, 'regular'),
          fontSize: theme.typography.body.fontSize,
        }}
      />
    </View>
  );

  if (isPending) {
    return (
      <Screen scroll={false} header={header}>
        <LoadingState label="Loading districts" />
      </Screen>
    );
  }

  if (isError && districts.length === 0) {
    return (
      <Screen scroll={false} header={header}>
        <ErrorState error={error} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} header={header}>
      <FlatList
        data={districts}
        keyExtractor={(district) => district.slug}
        renderItem={({ item, index }) => (
          <Entrance index={index}>
            <DistrictCard district={item} onPress={openDistrict} />
          </Entrance>
        )}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xxxl * 2,
          gap: theme.spacing.sm,
        }}
        onRefresh={refetch}
        refreshing={isRefetching}
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          <EmptyState
            title="No district matches that"
            message={`Nothing found for "${search}". Try part of the name.`}
            icon="search-outline"
          />
        }
        ListFooterComponent={
          districts.length > 0 ? (
            <VStack padding="lg" align="center">
              <Text variant="footnote" color="textMuted">
                {`${districts.length} of ${DISTRICT_COUNT} districts`}
              </Text>
            </VStack>
          ) : null
        }
      />
    </Screen>
  );
}
