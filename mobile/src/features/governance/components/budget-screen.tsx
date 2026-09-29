import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Card, Divider, HStack, Pressable, Text, VStack } from '@/components/atoms';
import {
  ActionButton,
  Chip,
  LoadingState,
  QueryBoundary,
  SectionHeader,
  SourceNote,
  StatTile,
} from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useT } from '@/i18n';
import { openExternal } from '@/lib/external-link';
import { formatNumber } from '@/lib/format';
import { useTheme } from '@/theme';

import { formatCrore } from '../format';
import { useDepartmentBudget } from '../hooks';
import type { BudgetReport } from '../schemas';

const DEPARTMENTS_SHOWN = 8;

/** A horizontal bar, as a share of the largest value in its group. */
function Bar({ share, color }: { share: number; color: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        height: 8,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surfaceMuted,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${Math.max(1, Math.min(100, share))}%`,
          height: '100%',
          borderRadius: theme.radius.pill,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function History({
  history,
  selected,
}: {
  history: BudgetReport['history'];
  selected: string;
}) {
  const theme = useTheme();
  const t = useT();
  const ordered = [...history].sort((a, b) => b.fiscalYear.localeCompare(a.fiscalYear));
  const largest = Math.max(1, ...ordered.map((year) => year.totalExpenditure));
  return (
    <Card padding="md">
      <VStack gap="sm">
        {ordered.map((year) => (
          <VStack key={year.fiscalYear} gap="xxs">
            <HStack justify="space-between">
              <Text
                variant="caption"
                weight={year.fiscalYear === selected ? 'semibold' : 'regular'}
                color={year.fiscalYear === selected ? 'primary' : 'text'}
              >
                {year.fiscalYear}
              </Text>
              <Text variant="caption" tabular>
                {formatCrore(year.totalExpenditure, 0)}
              </Text>
            </HStack>
            <Bar
              share={(year.totalExpenditure / largest) * 100}
              color={year.fiscalYear === selected ? theme.colors.primary : theme.colors.accent}
            />
          </VStack>
        ))}
        <Text variant="footnote" color="textMuted">
          {t('budget.history.note')}
        </Text>
      </VStack>
    </Card>
  );
}

/**
 * The state budget explorer: what Uttarakhand plans to spend, on what, and how that has moved
 * over the years - straight from the Budget Directorate's published documents.
 */
export function BudgetScreen() {
  const t = useT();
  const theme = useTheme();
  const [year, setYear] = useState<string | undefined>(undefined);
  const [showAll, setShowAll] = useState(false);
  const budget = useDepartmentBudget(year);

  return (
    <Screen onRefresh={() => void budget.refetch()} refreshing={budget.isRefetching}>
      <VStack gap="xs">
        <Text variant="title">{t('budget.title')}</Text>
        <Text variant="body" color="textMuted">
          {t('budget.intro')}
        </Text>
      </VStack>

      <QueryBoundary
        query={budget}
        loading={<LoadingState label={t('budget.loading')} />}
        isEmpty={(data) => data.fiscalYear === null}
        emptyTitle={t('budget.empty')}
      >
        {(data) => {
          const selected = data.fiscalYear ?? '';
          const summary = data.summary;
          const departments = [...data.departments].sort((a, b) => b.total - a.total);
          const shown = showAll ? departments : departments.slice(0, DEPARTMENTS_SHOWN);
          const largest = Math.max(1, ...departments.map((d) => d.total));
          const provenance = summary?.provenance ?? departments[0]?.provenance ?? null;
          return (
            <VStack gap="xl">
              <VStack gap="xs">
                <Text variant="footnote" color="textMuted">
                  {t('budget.year')}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <HStack gap="xs">
                    {data.availableYears.map((available) => (
                      <Chip
                        key={available}
                        label={available}
                        selected={available === selected}
                        onPress={() => setYear(available)}
                      />
                    ))}
                  </HStack>
                </ScrollView>
              </VStack>

              {summary ? (
                <VStack gap="sm">
                  <HStack gap="sm" wrap>
                    <StatTile
                      label={t('budget.expenditure')}
                      value={formatCrore(summary.totalExpenditure, 0)}
                      icon="wallet-outline"
                      tone="primary"
                    />
                    <StatTile
                      label={t('budget.capital')}
                      value={formatCrore(summary.capitalExpenditure, 0)}
                      icon="construct-outline"
                      caption={t('budget.capitalShare', {
                        pct: formatNumber(
                          (summary.capitalExpenditure / summary.totalExpenditure) * 100,
                          1
                        ),
                      })}
                    />
                  </HStack>
                  <HStack gap="sm" wrap>
                    <StatTile
                      label={t('budget.receipts')}
                      value={formatCrore(summary.totalReceipts, 0)}
                      icon="download-outline"
                    />
                    <StatTile
                      label={t('budget.revenueReceipts')}
                      value={formatCrore(summary.revenueReceipts, 0)}
                      icon="receipt-outline"
                    />
                  </HStack>
                  <ActionButton
                    label={t('budget.document', { year: summary.fiscalYear })}
                    icon="document-text-outline"
                    onPress={() => void openExternal(summary.documentUrl)}
                  />
                </VStack>
              ) : null}

              <VStack gap="sm">
                <SectionHeader
                  title={t('budget.departments.title')}
                  subtitle={t('budget.departments.subtitle', { year: selected })}
                />
                <Card padding="md">
                  {shown.map((department, index) => (
                    <VStack key={department.demandNo} gap="xs">
                      {index > 0 ? <Divider /> : null}
                      <HStack justify="space-between" align="flex-start" gap="md">
                        <Text variant="caption" style={{ flex: 1 }}>
                          {department.name}
                        </Text>
                        <VStack align="flex-end">
                          <Text variant="bodyStrong" tabular>
                            {formatCrore(department.total, 0)}
                          </Text>
                          <Text variant="footnote" color="textMuted" tabular>
                            {formatNumber(department.share, 1)}%
                          </Text>
                        </VStack>
                      </HStack>
                      <Bar
                        share={(department.total / largest) * 100}
                        color={theme.colors.primary}
                      />
                      <Text variant="footnote" color="textMuted">
                        {t('budget.demand', {
                          number: department.demandNo,
                          capital: formatCrore(
                            department.capital.voted + department.capital.charged,
                            0
                          ),
                        })}
                      </Text>
                    </VStack>
                  ))}
                </Card>
                {departments.length > DEPARTMENTS_SHOWN ? (
                  <Pressable
                    onPress={() => setShowAll((all) => !all)}
                    style={{ minHeight: 0, alignSelf: 'flex-start' }}
                  >
                    <Text variant="bodyStrong" color="primary">
                      {showAll
                        ? t('budget.showFewer')
                        : t('budget.showAll', { count: departments.length })}
                    </Text>
                  </Pressable>
                ) : null}
              </VStack>

              {data.history.length > 1 ? (
                <VStack gap="sm">
                  <SectionHeader
                    title={t('budget.history.title')}
                    subtitle={t('budget.history.subtitle')}
                  />
                  <History history={data.history} selected={selected} />
                </VStack>
              ) : null}

              <Card tone="muted" elevation="none">
                <Text variant="caption" color="textMuted">
                  {t('budget.caveat')}
                </Text>
              </Card>
              <SourceNote provenance={provenance} />
            </VStack>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}
