import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Entrance, Icon, Pressable, Text, VStack } from '@/components/atoms';
import { EmptyState, ErrorState, LoadingState } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { DISTRICT_COUNT } from '@/config/constants';
import { HIT_SLOP_MIN_SIZE, useTheme } from '@/theme';
import { familyFor, platformTextFixes } from '@/theme/fonts';

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
    [router]
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
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${DISTRICT_COUNT} districts`}
          placeholderTextColor={theme.colors.textMuted}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search districts"
          // Android otherwise paints the cursor and selection handles in the system accent
          // (often green or teal) rather than the brand colour iOS already uses.
          cursorColor={theme.colors.primary}
          selectionColor={theme.colors.primary}
          style={{
            height: 48,
            paddingLeft: theme.spacing.md,
            // Room for the clear button, so a long query never runs underneath it.
            paddingRight: search ? HIT_SLOP_MIN_SIZE : theme.spacing.md,
            // Android's EditText adds its own vertical padding and top-aligns text, which
            // pushes the text off-centre in a fixed-height field.
            paddingVertical: 0,
            textAlignVertical: 'center',
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            // The search field is a raw TextInput, so it has to name its font explicitly —
            // it is the one place the Text atom cannot do it for us.
            fontFamily: familyFor(search, 'regular'),
            fontSize: theme.typography.body.fontSize,
            ...platformTextFixes(search),
          }}
        />
        {/*
         * Drawn by the app, not by `clearButtonMode`: that prop is iOS-only, so Android readers
         * had no way to clear a query except deleting it character by character.
         */}
        {search ? (
          <Pressable
            onPress={() => setSearch('')}
            accessibilityLabel="Clear search"
            style={{
              position: 'absolute',
              right: 0,
              width: HIT_SLOP_MIN_SIZE,
              height: HIT_SLOP_MIN_SIZE,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="close-circle" size={18} tone="textMuted" />
          </Pressable>
        ) : null}
      </View>
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
