import React, { useState } from 'react';
import { View, ScrollView, Modal, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBusinessScenarios, useBusinessComparison } from '../hooks';
import { outcomeOf, readMetric } from '../outcome';
import {
  Text,
  Card,
  HStack,
  VStack,
  Icon,
  Pressable,
  Skeleton,
  Entrance,
} from '@/components/atoms';
import { useT, type Translate, type TranslationKey } from '@/i18n';
import { useTheme } from '@/theme';
import { AnimatedNumber } from '@/components/atoms/animated-number';

const METRIC_KEYS: Record<string, TranslationKey> = {
  connectivity: 'compare.metric.connectivity',
  tourism: 'compare.metric.tourism',
  roads: 'compare.metric.roads',
  urbanPopulation: 'compare.metric.urbanPopulation',
  agriculture: 'compare.metric.agriculture',
  safety: 'compare.metric.safety',
};

const CONFIDENCE_KEYS = {
  low: 'compare.confidence.low',
  medium: 'compare.confidence.medium',
  high: 'compare.confidence.high',
} as const satisfies Record<string, TranslationKey>;

/** A metric the API added that this build has no label for is shown by its key, not hidden. */
function metricLabel(t: Translate, key: string): string {
  const translationKey = METRIC_KEYS[key];
  return translationKey ? t(translationKey) : key;
}

// Generic Select component for Native
function NativeSelect({
  label,
  value,
  options,
  onSelect,
  disabledValues = [],
}: {
  label: string;
  value: string;
  options: { label: string; value: string; description?: string }[];
  onSelect: (v: string) => void;
  disabledValues?: string[];
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const theme = useTheme();
  const t = useT();

  const selectedOption = options.find((o) => o.value === value);

  return (
    <>
      <VStack gap="xs">
        <Text variant="footnote" color="textMuted">
          {label}
        </Text>
        <Pressable
          onPress={() => setModalVisible(true)}
          accessibilityLabel={`${label}: ${selectedOption?.label ?? 'not selected'}`}
          accessibilityHint={t('compare.choicesHint')}
          accessibilityState={{ expanded: modalVisible }}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
          }}
        >
          <Text variant="bodyStrong">
            {selectedOption ? selectedOption.label : t('compare.select')}
          </Text>
          <Icon name="chevron-down" size={16} tone="textMuted" />
        </Pressable>
      </VStack>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <View
            style={{
              padding: theme.spacing.md,
              paddingHorizontal: theme.spacing.xl,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text variant="heading">{label}</Text>
            <Pressable
              onPress={() => setModalVisible(false)}
              accessibilityLabel={t('compare.closeChoices', { label })}
            >
              <Icon name="close" size={24} tone="text" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
            <VStack gap="sm">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                const isDisabled = disabledValues.includes(opt.value);
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      onSelect(opt.value);
                      setModalVisible(false);
                    }}
                    disabled={isDisabled}
                    accessibilityRole="radio"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                    style={{
                      padding: theme.spacing.lg,
                      backgroundColor: isSelected
                        ? theme.colors.primaryMuted
                        : theme.colors.surface,
                      borderRadius: theme.radius.lg,
                      borderWidth: 1,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      opacity: isDisabled ? 0.45 : 1,
                    }}
                  >
                    <VStack gap="xs" style={{ flex: 1 }}>
                      <Text variant="bodyStrong" color={isSelected ? 'primary' : 'text'}>
                        {opt.label}
                      </Text>
                      {opt.description && (
                        <Text variant="caption" color="textMuted">
                          {opt.description}
                        </Text>
                      )}
                    </VStack>
                    {isSelected && <Icon name="checkmark-circle" size={24} tone="primary" />}
                  </Pressable>
                );
              })}
            </VStack>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

/**
 * One metric's row.
 *
 * `available: false` renders as "Not scored", never as a bar. The API fills an unmeasured
 * metric with a neutral 50 so the weighted index can still be computed, and this screen
 * used to draw that 50 as though roads or dairy output had been measured for the district.
 * Showing a number we never measured, in a product whose whole claim is provenance, is the
 * one mistake this screen must not make.
 */
function ScoreBar({
  label,
  score,
  weight,
  isWinner,
  available = true,
}: {
  label: string;
  score: number;
  weight: number;
  isWinner: boolean;
  available?: boolean;
}) {
  const theme = useTheme();
  const t = useT();

  if (!available) {
    return (
      <VStack gap="xs" style={{ marginVertical: theme.spacing.xs }}>
        <HStack justify="space-between" align="center">
          <Text variant="caption" color="textMuted">
            {label}
          </Text>
          <Text variant="caption" color="textMuted">
            {t('compare.notScored')}
          </Text>
        </HStack>
        <View
          style={{
            height: 6,
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: theme.radius.pill,
          }}
        />
      </VStack>
    );
  }

  return (
    <VStack gap="xs" style={{ marginVertical: theme.spacing.xs }}>
      <HStack justify="space-between" align="center">
        <Text variant="caption" color="text">
          {label}
        </Text>
        <Text variant="caption" color={isWinner ? 'primary' : 'textMuted'}>
          {Math.round(score)}
        </Text>
      </HStack>
      <View
        style={{
          height: 6,
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: theme.radius.pill,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${Math.min(100, Math.max(0, score))}%`,
            backgroundColor: isWinner ? theme.colors.primary : theme.colors.borderStrong,
            borderRadius: theme.radius.pill,
          }}
        />
      </View>
    </VStack>
  );
}

type DistrictOptionSource = {
  slug: string;
  name: { en: string };
};

export function BusinessComparisonScreen({
  districts = [],
}: {
  districts: DistrictOptionSource[];
}) {
  const [districtA, setDistrictA] = useState('');
  const [districtB, setDistrictB] = useState('');
  const [scenarioId, setScenarioId] = useState('');

  const [activeCompare, setActiveCompare] = useState<{
    a: string;
    b: string;
    scenarioId: string;
  } | null>(null);

  const {
    data: scenarios,
    isLoading: scenariosLoading,
    error: scenariosError,
    refetch: refetchScenarios,
  } = useBusinessScenarios();
  const {
    data: report,
    isLoading: reportLoading,
    error,
  } = useBusinessComparison(
    activeCompare?.a || '',
    activeCompare?.b || '',
    activeCompare?.scenarioId || ''
  );

  const theme = useTheme();
  const t = useT();
  const { width, fontScale } = useWindowDimensions();
  const stackDistrictSelectors = width < 390;
  /*
   * The two result cards sit side by side only when each column has room for a district name,
   * its score and the metric labels. Most Android phones are 360–400dp wide, where two columns
   * left ~130dp each and "Road Infrastructure" and "Rudraprayag" wrapped or collided with the
   * score. Below that they stack.
   */
  const stackDistrictCards = width < 400 || fontScale >= 1.3;
  const ResultRow = stackDistrictCards ? VStack : HStack;

  /*
   * Three outcomes, not two: a district, a tie, or no recommendation at all — see
   * `outcomeOf`, which is where the reasoning and its tests live.
   */
  const outcome = report ? outcomeOf(report) : null;
  const hasRecommendation = outcome?.kind === 'district';

  const selectedScenarioId = scenarioId || scenarios?.[0]?.id || '';

  const scenarioOptions =
    scenarios?.map((s) => ({
      label: `${s.name} (${s.category})`,
      value: s.id,
      description: s.description,
    })) || [];

  const districtOptions = districts.map((d) => ({
    label: d.name.en,
    value: d.slug,
  }));

  const handleSelectScenario = (v: string) => {
    setScenarioId(v);
    setActiveCompare(null);
  };
  const handleSelectA = (v: string) => {
    setDistrictA(v);
    setActiveCompare(null);
  };
  const handleSelectB = (v: string) => {
    setDistrictB(v);
    setActiveCompare(null);
  };
  const cannotCompare =
    !districtA || !districtB || districtA === districtB || !selectedScenarioId;

  return (
    <VStack gap="xl">
      {/* Configurator */}
      <Card>
        <VStack gap="md">
          <NativeSelect
            label={t('compare.whatBusiness')}
            value={selectedScenarioId}
            options={scenarioOptions}
            onSelect={handleSelectScenario}
          />
          {selectedScenarioId && scenarios ? (
            <Text variant="caption" color="textMuted">
              {scenarios.find((s) => s.id === selectedScenarioId)?.description}
            </Text>
          ) : null}

          <HStack
            gap="md"
            wrap={stackDistrictSelectors}
            style={{ marginTop: theme.spacing.md, alignItems: 'center' }}
          >
            <View style={{ flex: 1 }}>
              <NativeSelect
                label={t('compare.districtA')}
                value={districtA}
                options={districtOptions}
                onSelect={handleSelectA}
                disabledValues={districtB ? [districtB] : []}
              />
            </View>
            {!stackDistrictSelectors ? (
              <Text
                variant="bodyStrong"
                color="textMuted"
                style={{ marginTop: 24, marginHorizontal: 4 }}
              >
                {t('compare.vs')}
              </Text>
            ) : null}
            <View style={{ flex: 1 }}>
              <NativeSelect
                label={t('compare.districtB')}
                value={districtB}
                options={districtOptions}
                onSelect={handleSelectB}
                disabledValues={districtA ? [districtA] : []}
              />
            </View>
          </HStack>

          {districtA && districtA === districtB ? (
            <Text variant="caption" color="danger">
              {t('compare.sameDistrict')}
            </Text>
          ) : null}

          <Pressable
            disabled={cannotCompare}
            accessibilityState={{ disabled: cannotCompare }}
            accessibilityHint={t('compare.runHint')}
            onPress={() =>
              setActiveCompare({ a: districtA, b: districtB, scenarioId: selectedScenarioId })
            }
            style={{
              backgroundColor: cannotCompare ? theme.colors.surfaceMuted : theme.colors.accent,
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              alignItems: 'center',
              marginTop: theme.spacing.md,
            }}
            pressedStyle={{ opacity: 0.9 }}
          >
            <Text variant="bodyStrong" color="textInverse">
              {t('compare.run')}
            </Text>
          </Pressable>
        </VStack>
      </Card>

      {scenariosError ? (
        <Card
          padding="lg"
          tone="surface"
          style={{ borderColor: theme.colors.danger, borderWidth: 1 }}
          accessibilityRole="alert"
        >
          <VStack gap="sm">
            <HStack align="center" gap="sm">
              <Icon name="warning" size={24} tone="danger" />
              <Text variant="bodyStrong" color="danger">
                {t('compare.scenariosFailed')}
              </Text>
            </HStack>
            <Pressable
              onPress={() => void refetchScenarios()}
              accessibilityLabel={t('compare.retryScenarios')}
            >
              <Text variant="bodyStrong" color="primary">
                {t('common.tryAgain')}
              </Text>
            </Pressable>
          </VStack>
        </Card>
      ) : null}

      {error && activeCompare ? (
        <Entrance>
          <Card
            padding="lg"
            tone="surface"
            style={{ borderColor: theme.colors.danger, borderWidth: 1 }}
          >
            <HStack align="center" gap="sm">
              <Icon name="warning" size={24} tone="danger" />
              <Text variant="bodyStrong" color="danger">
                {t('compare.failed')}
              </Text>
            </HStack>
          </Card>
        </Entrance>
      ) : null}

      {scenariosLoading || (activeCompare && reportLoading) ? (
        <Entrance>
          <VStack gap="lg" style={{ marginTop: theme.spacing.md }}>
            <Skeleton height={140} radius="lg" />
            <HStack gap="md">
              <View style={{ flex: 1 }}>
                <Skeleton height={300} radius="lg" />
              </View>
              <View style={{ flex: 1 }}>
                <Skeleton height={300} radius="lg" />
              </View>
            </HStack>
          </VStack>
        </Entrance>
      ) : activeCompare && report ? (
        <Entrance>
          <VStack gap="lg" style={{ marginTop: theme.spacing.md }}>
            <Card
              padding="lg"
              tone={hasRecommendation ? 'surface' : 'muted'}
              style={
                hasRecommendation ? { borderColor: theme.colors.primary, borderWidth: 1 } : {}
              }
            >
              <VStack gap="md">
                <HStack align="center" gap="sm">
                  <Icon
                    name={
                      hasRecommendation
                        ? 'trophy'
                        : outcome?.kind === 'insufficient'
                          ? 'alert-circle'
                          : 'scale'
                    }
                    size={24}
                    tone={hasRecommendation ? 'primary' : 'textMuted'}
                  />
                  {/*
                   * `insufficient` is a third outcome, not a district.
                   *
                   * This used to test only for `tie`, so when the API reported that the
                   * evidence was too thin to recommend either district, the slug comparison
                   * below fell through and the screen named district B as recommended — a
                   * recommendation the API had explicitly declined to make.
                   */}
                  <Text variant="title" color={hasRecommendation ? 'primary' : 'text'}>
                    {outcome?.kind === 'insufficient'
                      ? t('compare.insufficient')
                      : outcome?.kind === 'tie'
                        ? t('compare.tie')
                        : t('compare.recommended', { name: outcome?.name ?? '' })}
                  </Text>
                </HStack>
                <Text variant="body" color="textMuted">
                  {report.verdict}
                </Text>
                {report.evidence ? (
                  <VStack gap="xs">
                    <Text variant="footnote" color="textMuted">
                      {t(CONFIDENCE_KEYS[report.evidence.confidence])} ·{' '}
                      {t('compare.coverage', { pct: String(report.evidence.coveragePct) })}
                    </Text>
                    {report.evidence.missingMetrics.length > 0 ? (
                      <Text variant="footnote" color="textMuted">
                        {t('compare.notScoredList', {
                          metrics: report.evidence.missingMetrics
                            .map((key) => metricLabel(t, key))
                            .join(', '),
                        })}
                      </Text>
                    ) : null}
                  </VStack>
                ) : null}
              </VStack>
            </Card>

            <ResultRow gap="md" align={stackDistrictCards ? 'stretch' : 'flex-start'}>
              {[report.districtA, report.districtB].map((dist) => {
                const isWinner = report.winner === dist.slug;
                return (
                  <View key={dist.slug} style={stackDistrictCards ? undefined : { flex: 1 }}>
                    <Card
                      padding="md"
                      style={
                        isWinner
                          ? {
                              backgroundColor: theme.colors.primaryMuted,
                              borderColor: theme.colors.primary,
                              borderWidth: 1,
                            }
                          : {}
                      }
                    >
                      <VStack gap="lg">
                        <HStack justify="space-between" align="center" gap="sm">
                          <Text
                            variant="heading"
                            color={isWinner ? 'primary' : 'text'}
                            style={{ flexShrink: 1 }}
                          >
                            {dist.name}
                          </Text>
                          <Text variant="metric" color={isWinner ? 'primary' : 'text'}>
                            <AnimatedNumber value={dist.score} />
                          </Text>
                        </HStack>

                        <VStack gap="sm">
                          {Object.keys(report.scenario.weights).map((key) => {
                            const weight =
                              report.scenario.weights[
                                key as keyof typeof report.scenario.weights
                              ];
                            if (weight === 0) return null;
                            const { available, score } = readMetric(
                              dist,
                              key as keyof typeof dist.metrics
                            );
                            return (
                              <ScoreBar
                                key={key}
                                label={metricLabel(t, key)}
                                score={score}
                                weight={weight}
                                isWinner={isWinner}
                                available={available}
                              />
                            );
                          })}
                        </VStack>
                      </VStack>
                    </Card>
                  </View>
                );
              })}
            </ResultRow>
          </VStack>
        </Entrance>
      ) : null}
    </VStack>
  );
}
