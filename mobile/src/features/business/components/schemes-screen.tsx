import { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';

import { Card, HStack, Text, VStack } from '@/components/atoms';
import {
  Chip,
  EmptyState,
  LoadingState,
  QueryBoundary,
  SearchField,
  SelectField,
} from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useT } from '@/i18n';
import { openExternal } from '@/lib/external-link';
import { formatDate } from '@/lib/format';

import { useBusinessSchemes } from '../hooks';
import { SUPPORT_BUCKETS, filterSchemes } from '../schemes';
import { SchemeCard } from './scheme-card';

/**
 * Scheme finder: verified finance, subsidy, guarantee, training and market-access programmes
 * usable from Uttarakhand, with the official route to apply.
 */
export function SchemesScreen() {
  const t = useT();
  const schemes = useBusinessSchemes();
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState('');
  const [bucket, setBucket] = useState('');

  const matches = useMemo(
    () => filterSchemes(schemes.data?.schemes ?? [], { query, sector, bucket }),
    [schemes.data, query, sector, bucket]
  );

  const sectorOptions = useMemo(
    () => [
      { value: '', label: t('schemes.allSectors') },
      ...(schemes.data?.sectors ?? []).map((value) => ({ value, label: value })),
    ],
    [schemes.data, t]
  );

  return (
    <Screen onRefresh={() => void schemes.refetch()} refreshing={schemes.isRefetching}>
      <VStack gap="xs">
        <Text variant="footnote" color="primary" weight="semibold">
          {t('schemes.eyebrow')}
        </Text>
        <Text variant="title">{t('schemes.title')}</Text>
        <Text variant="body" color="textMuted">
          {t('schemes.intro')}
        </Text>
      </VStack>

      <QueryBoundary
        query={schemes}
        loading={<LoadingState label={t('schemes.loading')} />}
        isEmpty={(data) => data.schemes.length === 0}
        emptyTitle={t('schemes.empty')}
      >
        {(data) => (
          <VStack gap="md">
            <Card padding="md">
              <VStack gap="md">
                <SearchField
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('schemes.search')}
                  accessibilityLabel={t('schemes.search')}
                  clearLabel={t('districts.clearSearch')}
                />
                <SelectField
                  label={t('schemes.sector')}
                  value={sector}
                  options={sectorOptions}
                  onSelect={setSector}
                  searchable
                />
                <VStack gap="xs">
                  <Text variant="footnote" color="textMuted">
                    {t('schemes.supportType')}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <HStack gap="xs">
                      <Chip
                        label={t('schemes.bucket.any')}
                        selected={bucket === ''}
                        onPress={() => setBucket('')}
                      />
                      {SUPPORT_BUCKETS.map((entry) => (
                        <Chip
                          key={entry.key}
                          label={t(entry.label)}
                          selected={bucket === entry.key}
                          onPress={() => setBucket(entry.key)}
                        />
                      ))}
                    </HStack>
                  </ScrollView>
                </VStack>
              </VStack>
            </Card>

            <Text variant="caption" color="textMuted">
              {t('schemes.count', { shown: matches.length, total: data.schemes.length })}
            </Text>

            {matches.length === 0 ? (
              <EmptyState icon="search-outline" title={t('schemes.noMatch')} />
            ) : (
              matches.map((scheme) => <SchemeCard key={scheme.slug} scheme={scheme} />)
            )}

            <Card tone="muted" elevation="none">
              <VStack gap="xs">
                <Text variant="caption" color="textMuted">
                  {t('schemes.verified', { date: formatDate(data.verifiedOn) })}
                </Text>
                <Text
                  variant="caption"
                  color="primary"
                  onPress={() => void openExternal(data.sourceUrl)}
                  accessibilityRole="link"
                >
                  {t('schemes.source')}
                </Text>
              </VStack>
            </Card>
          </VStack>
        )}
      </QueryBoundary>
    </Screen>
  );
}
