import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  Badge,
  Card,
  Divider,
  HStack,
  Pressable,
  Text,
  VStack,
  type BadgeTone,
} from '@/components/atoms';
import {
  Chip,
  EmptyState,
  LoadingState,
  SearchField,
  SectionHeader,
  StatTile,
} from '@/components/molecules';
import { Screen } from '@/components/templates';
import { formatRankedValue, formatVintage, useDistrictStanding } from '@/features/governance';
import { useIndicatorCatalogue } from '@/features/indicators';
import { useT, type Translate, type TranslationKey } from '@/i18n';
import { formatNumber, humanise } from '@/lib/format';
import { useLanguage } from '@/stores';
import { useTheme } from '@/theme';

import {
  buildBenchmarkRows,
  buildCoverageRows,
  buildSectorCoverage,
  type CoverageStatus,
} from '../model';

const SECTOR_KEYS: Record<string, TranslationKey> = {
  demography: 'sector.demography',
  education: 'sector.education',
  health: 'sector.health',
  economy: 'sector.economy',
  industry: 'sector.industry',
  connectivity: 'sector.connectivity',
  development: 'sector.development',
  tourism: 'sector.tourism',
  geography: 'sector.geography',
  environment: 'sector.environment',
};

export function sectorLabel(category: string, t: Translate): string {
  const key = SECTOR_KEYS[category];
  return key ? t(key) : humanise(category);
}

const STATUS: Record<CoverageStatus, { label: TranslationKey; tone: BadgeTone }> = {
  comparable: { label: 'intel.status.comparable', tone: 'success' },
  context: { label: 'intel.status.context', tone: 'primary' },
  partial: { label: 'intel.status.partial', tone: 'warning' },
  state: { label: 'intel.status.state', tone: 'neutral' },
  catalogue: { label: 'intel.status.catalogue', tone: 'neutral' },
  unavailable: { label: 'intel.status.unavailable', tone: 'danger' },
};

const BENCHMARKS_SHOWN = 6;

/**
 * The data explorer: what the platform knows, sector by sector, and which districts lead or
 * trail on every indicator that can fairly be compared across all thirteen.
 */
export function IntelligenceScreen() {
  const t = useT();
  const theme = useTheme();
  const router = useRouter();
  const language = useLanguage();
  const catalogue = useIndicatorCatalogue();
  const standing = useDistrictStanding();
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState('');
  const [allBenchmarks, setAllBenchmarks] = useState(false);

  const rows = useMemo(
    () => buildCoverageRows(catalogue.data ?? [], standing.data ?? null),
    [catalogue.data, standing.data]
  );
  const sectors = useMemo(() => buildSectorCoverage(rows), [rows]);
  const benchmarks = useMemo(() => buildBenchmarkRows(standing.data ?? null), [standing.data]);

  const needle = query.trim().toLowerCase();
  const filtered = rows.filter(
    (row) =>
      (!sector || row.category === sector) &&
      (!needle ||
        row.label.toLowerCase().includes(needle) ||
        row.labelHi.includes(query.trim()))
  );
  const comparable = rows.filter((row) => row.status === 'comparable').length;
  const shownBenchmarks = allBenchmarks ? benchmarks : benchmarks.slice(0, BENCHMARKS_SHOWN);

  return (
    <Screen
      onRefresh={() => {
        void catalogue.refetch();
        void standing.refetch();
      }}
      refreshing={catalogue.isRefetching || standing.isRefetching}
    >
      <VStack gap="xs">
        <Text variant="title">{t('intel.title')}</Text>
        <Text variant="body" color="textMuted">
          {t('intel.intro')}
        </Text>
      </VStack>

      {catalogue.isPending ? (
        <LoadingState label={t('intel.loading')} />
      ) : catalogue.isError ? (
        <EmptyState icon="cloud-offline-outline" title={t('intel.failed')} />
      ) : (
        <VStack gap="xl">
          <HStack gap="sm" wrap>
            <StatTile
              label={t('intel.indicators')}
              value={formatNumber(rows.length)}
              icon="stats-chart-outline"
              tone="primary"
              caption={t('intel.sectors', { count: sectors.length })}
            />
            <StatTile
              label={t('intel.comparable')}
              value={standing.isPending ? t('common.notAvailable') : formatNumber(comparable)}
              icon="git-compare-outline"
              caption={t('intel.comparable.caption')}
            />
          </HStack>

          {/* Sector coverage */}
          <VStack gap="sm">
            <SectionHeader
              title={t('intel.coverage.title')}
              subtitle={t('intel.coverage.subtitle')}
            />
            <Card padding="md">
              {sectors.map((entry, index) => (
                <VStack key={entry.category} gap="xs">
                  {index > 0 ? <Divider /> : null}
                  <Pressable
                    onPress={() => setSector(entry.category === sector ? '' : entry.category)}
                    accessibilityState={{ selected: entry.category === sector }}
                    style={{ minHeight: 0, paddingVertical: theme.spacing.xs }}
                  >
                    <VStack gap="xs">
                      <HStack justify="space-between">
                        <Text
                          variant="bodyStrong"
                          color={entry.category === sector ? 'primary' : 'text'}
                        >
                          {sectorLabel(entry.category, t)}
                        </Text>
                        <Text variant="caption" color="textMuted" tabular>
                          {t('intel.coverage.row', {
                            total: entry.total,
                            pct:
                              entry.districtTotal === 0
                                ? t('common.notAvailable')
                                : `${entry.coveragePercent}%`,
                          })}
                        </Text>
                      </HStack>
                      <View
                        style={{
                          height: 6,
                          borderRadius: theme.radius.pill,
                          backgroundColor: theme.colors.surfaceMuted,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            width: `${entry.coveragePercent}%`,
                            height: '100%',
                            backgroundColor: theme.colors.primary,
                          }}
                        />
                      </View>
                    </VStack>
                  </Pressable>
                </VStack>
              ))}
            </Card>
          </VStack>

          {/* Benchmarks */}
          {benchmarks.length > 0 ? (
            <VStack gap="sm">
              <SectionHeader
                title={t('intel.bench.title')}
                subtitle={t('intel.bench.subtitle')}
              />
              {shownBenchmarks.map((row) => (
                <Card key={row.key} padding="md">
                  <VStack gap="sm">
                    <HStack justify="space-between" gap="sm">
                      <Text variant="bodyStrong" style={{ flex: 1 }}>
                        {row.label}
                      </Text>
                      <Text variant="footnote" color="textMuted">
                        {formatVintage(row.vintage)}
                      </Text>
                    </HStack>
                    {(
                      [
                        ['intel.bench.leads', row.leaders, 'success'],
                        ['intel.bench.trails', row.trailers, 'warning'],
                      ] as const
                    ).map(([label, entries, tone]) => (
                      <HStack key={label} gap="sm" align="flex-start" wrap>
                        <Badge label={t(label)} tone={tone} />
                        <View style={{ flex: 1, gap: 2 }}>
                          {entries.map((entry) => (
                            <Text
                              key={entry.slug}
                              variant="caption"
                              accessibilityRole="link"
                              onPress={() => router.push(`/districts/${entry.slug}`)}
                            >
                              <Text variant="caption" weight="semibold" color="primary">
                                {entry.name}
                              </Text>
                              {'  '}
                              {formatRankedValue(entry.item)}
                            </Text>
                          ))}
                        </View>
                      </HStack>
                    ))}
                  </VStack>
                </Card>
              ))}
              {benchmarks.length > BENCHMARKS_SHOWN ? (
                <Pressable
                  onPress={() => setAllBenchmarks((all) => !all)}
                  style={{ minHeight: 0, alignSelf: 'flex-start' }}
                >
                  <Text variant="bodyStrong" color="primary">
                    {allBenchmarks
                      ? t('budget.showFewer')
                      : t('intel.bench.showAll', { count: benchmarks.length })}
                  </Text>
                </Pressable>
              ) : null}
            </VStack>
          ) : null}

          {/* Catalogue */}
          <VStack gap="sm">
            <SectionHeader
              title={t('intel.catalogue.title')}
              subtitle={t('intel.catalogue.subtitle')}
            />
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={t('intel.catalogue.search')}
              accessibilityLabel={t('intel.catalogue.search')}
              clearLabel={t('districts.clearSearch')}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <HStack gap="xs">
                <Chip
                  label={t('intel.allSectors')}
                  selected={sector === ''}
                  onPress={() => setSector('')}
                />
                {sectors.map((entry) => (
                  <Chip
                    key={entry.category}
                    label={sectorLabel(entry.category, t)}
                    selected={sector === entry.category}
                    onPress={() => setSector(entry.category)}
                  />
                ))}
              </HStack>
            </ScrollView>
            {filtered.length === 0 ? (
              <EmptyState icon="search-outline" title={t('select.noMatch')} />
            ) : (
              <Card padding="md">
                {filtered.map((row, index) => (
                  <VStack key={row.key} gap="xs">
                    {index > 0 ? <Divider /> : null}
                    <Text variant="body">{language === 'hi' ? row.labelHi : row.label}</Text>
                    <HStack gap="xs" wrap align="center">
                      <Badge
                        label={t(STATUS[row.status].label)}
                        tone={STATUS[row.status].tone}
                      />
                      <Text variant="footnote" color="textMuted">
                        {sectorLabel(row.category, t)}
                        {row.vintage ? ` · ${formatVintage(row.vintage)}` : ''}
                      </Text>
                    </HStack>
                  </VStack>
                ))}
              </Card>
            )}
          </VStack>

          <Card tone="muted" elevation="none">
            <Text variant="caption" color="textMuted">
              {t('intel.caveat')}
            </Text>
          </Card>
        </VStack>
      )}
    </Screen>
  );
}
