import { useWindowDimensions, View } from 'react-native';

import { Eyebrow, HStack, Icon, Text, VStack } from '@/components/atoms';
import { LoadingState, QueryBoundary } from '@/components/molecules';
import { STATE_SLUG } from '@/config/constants';
import { useAreaIndicators } from '@/features/indicators';
import { useT, type TranslationKey } from '@/i18n';
import { formatDate, formatNumber, localise } from '@/lib/format';
import { shouldStackCardGrid } from '@/lib/layout';
import { useLanguage } from '@/stores';
import { useTheme } from '@/theme';

/**
 * The state profile figures shown, in this order. The same keys the web home page uses
 * (web/src/features/dashboard/services/index.ts), so the two never show different years
 * for the same fact. The Census 2011 rows (`state_population`, `state_literacy_rate`,
 * `state_villages`) still exist, but they are history now, not a current profile.
 */
const GLANCE_KEYS = [
  'state_population_projection',
  'state_forest_cover_pct',
  'state_literacy_plfs',
  'state_administrative_villages',
  'state_area_sq_km',
];

/** What each figure is, where its label alone could mislead. Mirrors the web notes. */
const GLANCE_NOTES: Partial<Record<string, TranslationKey>> = {
  state_population_projection: 'today.glance.note.population',
  state_literacy_plfs: 'today.glance.note.literacy',
  state_administrative_villages: 'today.glance.note.villages',
};

/** Each figure gets its own ink so the grid reads as four facts, not one table. */
const VALUE_INK = ['primary', 'success', 'text', 'accent'] as const;

function unitSuffix(unit: string): string {
  if (unit === 'percent' || unit === 'pct') return '%';
  if (unit === 'sq_km') return ' km²';
  return '';
}

function GlanceNote({ indicatorKey }: { indicatorKey: string }) {
  const t = useT();
  const note = GLANCE_NOTES[indicatorKey];
  if (note === undefined) return null;
  return (
    <Text variant="footnote" color="textMuted">
      {t(note)}
    </Text>
  );
}

/** Published state profile figures, each with the date it describes and who published it. */
export function StateGlance() {
  const theme = useTheme();
  const t = useT();
  const language = useLanguage();
  const { width, fontScale } = useWindowDimensions();
  const indicators = useAreaIndicators(STATE_SLUG);
  const stack = shouldStackCardGrid(width, fontScale);

  return (
    <VStack
      gap="md"
      padding="lg"
      style={{ borderRadius: theme.radius.xl, backgroundColor: theme.colors.surfaceTertiary }}
    >
      <HStack align="center" gap="xs">
        <Icon name="business" size={18} tone="primary" />
        <Text variant="heading" weight="bold" accessibilityRole="header" style={{ flex: 1 }}>
          {t('today.glance.title')}
        </Text>
      </HStack>

      <QueryBoundary
        query={indicators}
        loading={<LoadingState label={t('today.glance.loading')} />}
        isEmpty={(data) => data.values.length === 0}
        emptyTitle={t('today.glance.empty')}
      >
        {(data) => (
          <HStack gap="sm" wrap>
            {data.values
              .filter((entry) => GLANCE_KEYS.includes(entry.indicator.key))
              .sort(
                (a, b) =>
                  GLANCE_KEYS.indexOf(a.indicator.key) - GLANCE_KEYS.indexOf(b.indicator.key)
              )
              .map((entry, index) => (
                <View
                  key={entry.indicator.key}
                  style={{
                    width: stack ? '100%' : '47%',
                    flexGrow: 1,
                    gap: theme.spacing.xxs,
                    padding: theme.spacing.md,
                    borderRadius: theme.radius.lg,
                    backgroundColor: theme.colors.surface,
                  }}
                >
                  <Eyebrow color="textMuted" numberOfLines={1}>
                    {localise(entry.indicator.label, language)}
                  </Eyebrow>
                  <Text variant="title" tabular color={VALUE_INK[index % VALUE_INK.length]}>
                    {formatNumber(entry.value, entry.indicator.decimals)}
                    {unitSuffix(entry.indicator.unit)}
                  </Text>
                  <Text variant="footnote" color="textMuted" numberOfLines={2}>
                    {formatDate(entry.vintage)} ·{' '}
                    {entry.provenance?.department
                      ? localise(entry.provenance.department, language)
                      : t('common.sourceNotRecorded')}
                  </Text>
                  <GlanceNote indicatorKey={entry.indicator.key} />
                </View>
              ))}
          </HStack>
        )}
      </QueryBoundary>
    </VStack>
  );
}
