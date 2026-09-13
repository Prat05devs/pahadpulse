import React, { useState } from 'react';
import { View, ScrollView, Modal, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBusinessScenarios, useBusinessComparison } from '../hooks';
import { Text, Card, HStack, VStack, Icon, Pressable, Skeleton, Entrance } from '@/components/atoms';
import { useTheme } from '@/theme';
import { AnimatedNumber } from '@/components/atoms/animated-number';

const METRIC_LABELS: Record<string, string> = {
  connectivity: 'Digital Connectivity',
  tourism: 'Tourism Footfall',
  roads: 'Road Infrastructure',
  urbanPopulation: 'Urban Market Size',
  agriculture: 'Agro/Dairy Output',
  safety: 'Geological Safety',
};

// Generic Select component for Native
function NativeSelect({ label, value, options, onSelect, disabledValues = [] }: { label: string, value: string, options: { label: string, value: string, description?: string }[], onSelect: (v: string) => void, disabledValues?: string[] }) {
  const [modalVisible, setModalVisible] = useState(false);
  const theme = useTheme();
  
  const selectedOption = options.find(o => o.value === value);

  return (
    <>
      <VStack gap="xs">
        <Text variant="footnote" color="textMuted">{label}</Text>
        <Pressable
          onPress={() => setModalVisible(true)}
          accessibilityLabel={`${label}: ${selectedOption?.label ?? 'not selected'}`}
          accessibilityHint="Opens a list of choices"
          accessibilityState={{ expanded: modalVisible }}
          style={{ borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.md, borderRadius: theme.radius.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface }}
        >
          <Text variant="bodyStrong">{selectedOption ? selectedOption.label : 'Select...'}</Text>
          <Icon name="chevron-down" size={16} tone="textMuted" />
        </Pressable>
      </VStack>

      <Modal visible={modalVisible} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'} onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <View style={{ padding: theme.spacing.md, paddingHorizontal: theme.spacing.xl, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="heading">{label}</Text>
            <Pressable onPress={() => setModalVisible(false)} accessibilityLabel={`Close ${label} choices`}>
              <Icon name="close" size={24} tone="text" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
            <VStack gap="sm">
              {options.map(opt => {
                const isSelected = opt.value === value;
                const isDisabled = disabledValues.includes(opt.value);
                return (
                  <Pressable
                    key={opt.value} 
                    onPress={() => { onSelect(opt.value); setModalVisible(false); }}
                    disabled={isDisabled}
                    accessibilityRole="radio"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                    style={{ 
                      padding: theme.spacing.lg, 
                      backgroundColor: isSelected ? theme.colors.primaryMuted : theme.colors.surface, 
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
                      <Text variant="bodyStrong" color={isSelected ? 'primary' : 'text'}>{opt.label}</Text>
                      {opt.description && <Text variant="caption" color="textMuted">{opt.description}</Text>}
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

function ScoreBar({ label, score, weight, isWinner }: { label: string; score: number; weight: number; isWinner: boolean }) {
  const theme = useTheme();
  return (
    <VStack gap="xs" style={{ marginVertical: theme.spacing.xs }}>
      <HStack justify="space-between" align="center">
        <Text variant="caption" color="text">{label}</Text>
        <Text variant="caption" color={isWinner ? 'primary' : 'textMuted'}>{Math.round(score)}</Text>
      </HStack>
      <View style={{ height: 6, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.pill, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${Math.min(100, Math.max(0, score))}%`, backgroundColor: isWinner ? theme.colors.primary : theme.colors.borderStrong, borderRadius: theme.radius.pill }} />
      </View>
    </VStack>
  );
}

type DistrictOptionSource = {
  slug: string;
  name: { en: string };
};

export function BusinessComparisonScreen({ districts = [] }: { districts: DistrictOptionSource[] }) {
  const [districtA, setDistrictA] = useState('');
  const [districtB, setDistrictB] = useState('');
  const [scenarioId, setScenarioId] = useState('');

  const [activeCompare, setActiveCompare] = useState<{a: string, b: string, scenarioId: string} | null>(null);

  const { data: scenarios, isLoading: scenariosLoading, error: scenariosError, refetch: refetchScenarios } = useBusinessScenarios();
  const { data: report, isLoading: reportLoading, error } = useBusinessComparison(
    activeCompare?.a || '',
    activeCompare?.b || '',
    activeCompare?.scenarioId || ''
  );

  const theme = useTheme();
  const { width } = useWindowDimensions();
  const stackDistrictSelectors = width < 390;

  const selectedScenarioId = scenarioId || scenarios?.[0]?.id || '';

  const scenarioOptions = scenarios?.map(s => ({
    label: `${s.name} (${s.category})`,
    value: s.id,
    description: s.description
  })) || [];

  const districtOptions = districts.map(d => ({
    label: d.name.en,
    value: d.slug
  }));

  const handleSelectScenario = (v: string) => { setScenarioId(v); setActiveCompare(null); };
  const handleSelectA = (v: string) => { setDistrictA(v); setActiveCompare(null); };
  const handleSelectB = (v: string) => { setDistrictB(v); setActiveCompare(null); };
  const cannotCompare = !districtA || !districtB || districtA === districtB || !selectedScenarioId;

  return (
    <VStack gap="xl">
      {/* Configurator */}
      <Card>
        <VStack gap="md">
          <NativeSelect 
            label="What business are you planning?" 
            value={selectedScenarioId}
            options={scenarioOptions} 
            onSelect={handleSelectScenario} 
          />
          {selectedScenarioId && scenarios ? (
            <Text variant="caption" color="textMuted">
              {scenarios.find(s => s.id === selectedScenarioId)?.description}
            </Text>
          ) : null}

          <HStack gap="md" wrap={stackDistrictSelectors} style={{ marginTop: theme.spacing.md, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <NativeSelect label="Compare" value={districtA} options={districtOptions} onSelect={handleSelectA} disabledValues={districtB ? [districtB] : []} />
            </View>
            {!stackDistrictSelectors ? <Text variant="bodyStrong" color="textMuted" style={{ marginTop: 24, marginHorizontal: 4 }}>VS</Text> : null}
            <View style={{ flex: 1 }}>
              <NativeSelect label="With" value={districtB} options={districtOptions} onSelect={handleSelectB} disabledValues={districtA ? [districtA] : []} />
            </View>
          </HStack>

          {districtA && districtA === districtB ? (
            <Text variant="caption" color="danger">Choose two different districts.</Text>
          ) : null}

          <Pressable 
            disabled={cannotCompare}
            accessibilityState={{ disabled: cannotCompare }}
            accessibilityHint="Builds a side-by-side district recommendation"
            onPress={() => setActiveCompare({ a: districtA, b: districtB, scenarioId: selectedScenarioId })}
            style={{
              backgroundColor: cannotCompare ? theme.colors.surfaceMuted : theme.colors.accent,
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              alignItems: 'center',
              marginTop: theme.spacing.md,
            }}
            pressedStyle={{ opacity: 0.9 }}
          >
            <Text variant="bodyStrong" color="textInverse">Compare</Text>
          </Pressable>
        </VStack>
      </Card>

      {scenariosError ? (
        <Card padding="lg" tone="surface" style={{ borderColor: theme.colors.danger, borderWidth: 1 }} accessibilityRole="alert">
          <VStack gap="sm">
            <HStack align="center" gap="sm">
              <Icon name="warning" size={24} tone="danger" />
              <Text variant="bodyStrong" color="danger">Business types could not be loaded.</Text>
            </HStack>
            <Pressable onPress={() => void refetchScenarios()} accessibilityLabel="Retry loading business types">
              <Text variant="bodyStrong" color="primary">Try again</Text>
            </Pressable>
          </VStack>
        </Card>
      ) : null}

      {error && activeCompare ? (
        <Entrance>
          <Card padding="lg" tone="surface" style={{ borderColor: theme.colors.danger, borderWidth: 1 }}>
            <HStack align="center" gap="sm">
              <Icon name="warning" size={24} tone="danger" />
              <Text variant="bodyStrong" color="danger">Failed to load comparison.</Text>
            </HStack>
          </Card>
        </Entrance>
      ) : null}

      {scenariosLoading || (activeCompare && reportLoading) ? (
        <Entrance>
          <VStack gap="lg" style={{ marginTop: theme.spacing.md }}>
            <Skeleton height={140} radius="lg" />
            <HStack gap="md">
              <View style={{ flex: 1 }}><Skeleton height={300} radius="lg" /></View>
              <View style={{ flex: 1 }}><Skeleton height={300} radius="lg" /></View>
            </HStack>
          </VStack>
        </Entrance>
      ) : activeCompare && report ? (
        <Entrance>
          <VStack gap="lg" style={{ marginTop: theme.spacing.md }}>
            <Card 
              padding="lg" 
              tone={report.winner === 'tie' ? 'muted' : 'surface'} 
              style={report.winner !== 'tie' ? { borderColor: theme.colors.primary, borderWidth: 1 } : {}}
            >
              <VStack gap="md">
                <HStack align="center" gap="sm">
                  <Icon name={report.winner === 'tie' ? 'scale' : 'trophy'} size={24} tone={report.winner === 'tie' ? 'textMuted' : 'primary'} />
                  <Text variant="title" color={report.winner === 'tie' ? 'text' : 'primary'}>
                    {report.winner === 'tie' ? 'It’s a tie!' : `${report.winner === report.districtA.slug ? report.districtA.name : report.districtB.name} is recommended`}
                  </Text>
                </HStack>
                <Text variant="body" color="textMuted">{report.verdict}</Text>
              </VStack>
            </Card>

            <HStack gap="md" align="flex-start">
              {[report.districtA, report.districtB].map((dist) => {
                const isWinner = report.winner === dist.slug;
                return (
                  <View key={dist.slug} style={{ flex: 1 }}>
                    <Card padding="md" style={isWinner ? { backgroundColor: theme.colors.primaryMuted, borderColor: theme.colors.primary, borderWidth: 1 } : {}}>
                      <VStack gap="lg">
                        <HStack justify="space-between" align="center">
                          <Text variant="heading" color={isWinner ? 'primary' : 'text'}>{dist.name}</Text>
                          <Text variant="metric" color={isWinner ? 'primary' : 'text'}><AnimatedNumber value={dist.score} /></Text>
                        </HStack>
                        
                        <VStack gap="sm">
                          {(Object.keys(report.scenario.weights)).map((key) => {
                            const weight = report.scenario.weights[key as keyof typeof report.scenario.weights];
                            if (weight === 0) return null;
                            const score = dist.metrics[key as keyof typeof dist.metrics] || 0;
                            return (
                              <ScoreBar 
                                key={key} 
                                label={METRIC_LABELS[key] || key} 
                                score={score} 
                                weight={weight} 
                                isWinner={isWinner} 
                              />
                            );
                          })}
                        </VStack>
                      </VStack>
                    </Card>
                  </View>
                );
              })}
            </HStack>
          </VStack>
        </Entrance>
      ) : null}
    </VStack>
  );
}
