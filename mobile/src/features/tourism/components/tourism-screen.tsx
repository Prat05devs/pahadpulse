import { useState } from 'react';

import { Card, Divider, HStack, Text, VStack } from '@/components/atoms';
import {
  Chip,
  LoadingState,
  QueryBoundary,
  SectionHeader,
  SourceNote,
  StatTile,
} from '@/components/molecules';
import { useT } from '@/i18n';
import { Screen } from '@/components/templates';
import { formatCompact, formatNumber, localise } from '@/lib/format';
import { useLanguage } from '@/stores';

import { usePilgrimArrivals } from '../hooks';

export function TourismScreen() {
  const t = useT();
  const language = useLanguage();
  const [year, setYear] = useState<number | null>(null);
  const arrivals = usePilgrimArrivals();

  const refreshAll = () => {
    void arrivals.refetch();
  };

  return (
    <Screen onRefresh={refreshAll} refreshing={arrivals.isRefetching}>
      <QueryBoundary
        query={arrivals}
        loading={<LoadingState label={t('tourism.loading')} />}
        isEmpty={(data) => data.destinations.length === 0}
        emptyTitle={t('tourism.empty')}
      >
        {(data) => {
          const latest = data.totals[data.totals.length - 1];
          const recordYear = data.totals.find((t) => t.year === 2025);
          const selectedYear = year ?? latest?.year ?? data.years[0];
          const source =
            data.destinations
              .flatMap((destination) => destination.years)
              .find((entry) => entry.provenance)?.provenance ?? null;
          const ordered = [...data.destinations]
            .filter((d) => d.years.some((entry) => entry.year === selectedYear))
            .sort((a, b) => {
              const aValue =
                a.years.find((entry) => entry.year === selectedYear)?.visitors ?? -1;
              const bValue =
                b.years.find((entry) => entry.year === selectedYear)?.visitors ?? -1;
              return bValue - aValue;
            });

          return (
            <VStack gap="lg">
              <Card tone="muted" elevation="none">
                <Text variant="body" color="textMuted">
                  {t('tourism.caveat')}
                </Text>
              </Card>

              {latest ? (
                <HStack gap="sm" wrap>
                  <StatTile
                    label={t('tourism.touristsIn', { year: latest.year })}
                    value={formatCompact(latest.visitors)}
                    caption={t('tourism.acrossDestinations', {
                      count: formatNumber(latest.visitors),
                    })}
                    tone="primary"
                  />
                  {recordYear ? (
                    <StatTile
                      label={t('tourism.touristsIn', { year: recordYear.year })}
                      value={formatCompact(recordYear.visitors)}
                      caption={t('tourism.record', {
                        count: formatNumber(recordYear.visitors),
                      })}
                    />
                  ) : null}
                </HStack>
              ) : null}

              <VStack gap="sm">
                <SectionHeader
                  title={t('tourism.byDestination')}
                  subtitle={t('tourism.selectYear')}
                />
                <HStack gap="xs" wrap>
                  {data.years.map((availableYear) => (
                    <Chip
                      key={availableYear}
                      label={String(availableYear)}
                      selected={selectedYear === availableYear}
                      onPress={() => setYear(availableYear)}
                    />
                  ))}
                </HStack>
                {selectedYear === 2026 ? (
                  <Card tone="warning" elevation="none" padding="md">
                    <Text variant="bodyStrong" color="warning">
                      {t('tourism.tentative')}
                    </Text>
                    <Text variant="body" color="textMuted">
                      {t('tourism.ongoing')}
                    </Text>
                  </Card>
                ) : null}
                <Card padding="md">
                  {ordered.map((destination, index) => {
                    const entry = destination.years.find((item) => item.year === selectedYear);
                    return (
                      <VStack key={destination.slug} gap="sm">
                        {index > 0 ? <Divider /> : null}
                        <HStack justify="space-between" align="center" gap="md">
                          <VStack gap="xxs" style={{ flex: 1 }}>
                            <Text variant="bodyStrong">
                              {localise(destination.name, language)}
                            </Text>
                            <Text variant="caption" color="textMuted">
                              {localise(destination.district.name, language)}
                            </Text>
                          </VStack>
                          <Text variant="heading" tabular>
                            {entry ? formatNumber(entry.visitors) : '—'}
                          </Text>
                        </HStack>
                      </VStack>
                    );
                  })}
                  <Divider />
                  <HStack justify="space-between" align="center">
                    <Text variant="bodyStrong">{t('tourism.total')}</Text>
                    <Text variant="heading" color="primary" tabular>
                      {formatNumber(
                        data.totals.find((total) => total.year === selectedYear)?.visitors ?? 0
                      )}
                    </Text>
                  </HStack>
                </Card>
                <Text variant="caption" color="textMuted">
                  {t('tourism.suspended')}
                </Text>
              </VStack>

              <SourceNote provenance={source} />
            </VStack>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}
