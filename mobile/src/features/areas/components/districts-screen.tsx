import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView } from 'react-native';

import { Card, Entrance, HStack, Icon, Pressable, Text, VStack } from '@/components/atoms';
import {
  Chip,
  CivicHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  SearchField,
  SectionHeader,
} from '@/components/molecules';
import { Screen } from '@/components/templates';
import { DISTRICT_COUNT } from '@/config/constants';
import { useT } from '@/i18n';
import { useSavedDistricts } from '@/stores';
import { useTheme } from '@/theme';

import { useDistrictList } from '../hooks';
import { DistrictCard } from './district-card';

type DistrictFilter = 'all' | 'followed' | 'garhwal' | 'kumaon';

/**
 * Every district, searchable, with followed ones pinned to the top.
 *
 * A `FlatList` rather than a `ScrollView` even at thirteen rows: the list is the pattern a
 * future tehsil or village list will copy, and thirteen is only small until villages arrive.
 */
export function DistrictsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<DistrictFilter>('all');
  const savedDistricts = useSavedDistricts();

  // One stable handler for every row, so DistrictCard's memo actually holds.
  const openDistrict = useCallback(
    (slug: string) => router.push(`/districts/${slug}`),
    [router]
  );

  const {
    districts: matchedDistricts,
    data: allDistricts,
    isPending,
    isError,
    error,
    refetch,
    isRefetching,
  } = useDistrictList(search);

  const districts = useMemo(
    () =>
      matchedDistricts.filter((district) => {
        if (filter === 'followed') return savedDistricts.includes(district.slug);
        if (filter === 'all') return true;
        return district.division?.toLowerCase() === filter;
      }),
    [filter, matchedDistricts, savedDistricts]
  );

  const divisionCounts = useMemo(
    () => ({
      garhwal: (allDistricts ?? []).filter(
        (district) => district.division?.toLowerCase() === 'garhwal'
      ).length,
      kumaon: (allDistricts ?? []).filter(
        (district) => district.division?.toLowerCase() === 'kumaon'
      ).length,
    }),
    [allDistricts]
  );

  const filters: { value: DistrictFilter; label: string }[] = [
    { value: 'all', label: t('districts.filter.all') },
    {
      value: 'followed',
      label: t('districts.filter.followed', { count: savedDistricts.length }),
    },
    { value: 'garhwal', label: t('districts.garhwal') },
    { value: 'kumaon', label: t('districts.kumaon') },
  ];

  const header = (
    <CivicHeader
      title={t('nav.districts')}
      eyebrow={t('districts.header.eyebrow')}
      subtitle={t('districts.header.subtitle', { count: DISTRICT_COUNT })}
      showStatusDot={false}
    >
      <VStack gap="sm" paddingX="lg">
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder={t('districts.search', { count: DISTRICT_COUNT })}
          accessibilityLabel={t('districts.searchLabel')}
          clearLabel={t('districts.clearSearch')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -theme.spacing.lg }}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            gap: theme.spacing.xs,
          }}
        >
          {filters.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={filter === item.value}
              onPress={() => setFilter(item.value)}
            />
          ))}
        </ScrollView>
      </VStack>
    </CivicHeader>
  );

  if (isPending) {
    return (
      <Screen scroll={false} header={header}>
        <LoadingState label={t('today.districts.loading')} />
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
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.spacing.xxxl * 2,
          gap: theme.spacing.sm,
        }}
        onRefresh={refetch}
        refreshing={isRefetching}
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          filter === 'all' && search.trim().length === 0 ? (
            <VStack gap="md" style={{ marginBottom: theme.spacing.sm }}>
              <SectionHeader
                title={t('districts.divisions.title')}
                subtitle={t('districts.divisions.subtitle')}
              />
              <HStack gap="sm">
                <DivisionCard
                  label={t('districts.garhwal')}
                  count={divisionCounts.garhwal}
                  icon="trail-sign-outline"
                  tone="primary"
                  onPress={() => setFilter('garhwal')}
                />
                <DivisionCard
                  label={t('districts.kumaon')}
                  count={divisionCounts.kumaon}
                  icon="leaf-outline"
                  tone="accent"
                  onPress={() => setFilter('kumaon')}
                />
              </HStack>
              <SectionHeader
                title={t('districts.directory.title')}
                subtitle={t('districts.directory.subtitle')}
              />
            </VStack>
          ) : (
            <SectionHeader
              title={
                filter === 'followed'
                  ? t('districts.followed.title')
                  : t('districts.directory.title')
              }
              subtitle={t('districts.countOf', {
                shown: districts.length,
                total: DISTRICT_COUNT,
              })}
            />
          )
        }
        ListEmptyComponent={
          <EmptyState
            title={t('districts.noMatch')}
            message={t('districts.noMatchMessage', { query: search })}
            icon="search-outline"
          />
        }
        ListFooterComponent={
          districts.length > 0 ? (
            <VStack padding="lg" align="center">
              <Text variant="footnote" color="textMuted">
                {t('districts.countOf', { shown: districts.length, total: DISTRICT_COUNT })}
              </Text>
            </VStack>
          ) : null
        }
      />
    </Screen>
  );
}

function DivisionCard({
  label,
  count,
  icon,
  tone,
  onPress,
}: {
  label: string;
  count: number;
  icon: 'trail-sign-outline' | 'leaf-outline';
  tone: 'primary' | 'accent';
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count}`}
      style={{ flex: 1, minWidth: 0 }}
    >
      <Card tone={tone} elevation="none" padding="md" style={{ minHeight: 138 }}>
        <VStack gap="sm">
          <Icon name={icon} tone={tone} />
          <VStack gap="xxs">
            <Text variant="heading">{label}</Text>
            <Text variant="caption" color="textMuted">
              {count}
            </Text>
          </VStack>
          <Icon name="arrow-forward" size={17} color={theme.colors[tone]} />
        </VStack>
      </Card>
    </Pressable>
  );
}
