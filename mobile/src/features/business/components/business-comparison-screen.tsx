import React, { useState } from 'react';
import { View, ScrollView, Modal, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBusinessScenarios, useBusinessComparison } from '../hooks';
import { Text, Card, HStack, VStack, Icon, Pressable, Spinner, Skeleton, Entrance } from '@/components/atoms';
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
function NativeSelect({ label, value, options, onSelect }: { label: string, value: string, options: { label: string, value: string, description?: string }[], onSelect: (v: string) => void }) {
  const [modalVisible, setModalVisible] = useState(false);
  const theme = useTheme();
  
  const selectedOption = options.find(o => o.value === value);

  return (
    <>
      <VStack gap="xs">
        <Text variant="footnote" color="textMuted">{label}</Text>
        <Pressable onPress={() => setModalVisible(true)} style={{ borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.md, borderRadius: theme.radius.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface }}>
          <Text variant="bodyStrong">{selectedOption ? selectedOption.label : 'Select...'}</Text>
          <Icon name="chevron-down" size={16} tone="textMuted" />
        </Pressable>
      </VStack>

      <Modal visible={modalVisible} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'} onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <View style={{ padding: theme.spacing.md, paddingHorizontal: theme.spacing.xl, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="heading">{label}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={24} tone="text" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
            <VStack gap="sm">
              {options.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <TouchableOpacity 
                    key={opt.value} 
                    onPress={() => { onSelect(opt.value); setModalVisible(false); }}
                    style={{ 
                      padding: theme.spacing.lg, 
                      backgroundColor: isSelected ? theme.colors.primaryMuted : theme.colors.surface, 
                      borderRadius: theme.radius.lg, 
                      borderWidth: 1, 
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <VStack gap="xs" style={{ flex: 1 }}>
                      <Text variant="bodyStrong" color={isSelected ? 'primary' : 'text'}>{opt.label}</Text>
                      {opt.description && <Text variant="caption" color="textMuted">{opt.description}</Text>}
                    </VStack>
                    {isSelected && <Icon name="checkmark-circle" size={24} tone="primary" />}
                  </TouchableOpacity>
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

export function BusinessComparisonScreen({ districts = [] }: { districts: any[] }) {
  const [districtA, setDistrictA] = useState('');
  const [districtB, setDistrictB] = useState('');
  const [scenarioId, setScenarioId] = useState('');

  const [activeCompare, setActiveCompare] = useState<{a: string, b: string, scenarioId: string} | null>(null);

  const { data: scenarios, isLoading: scenariosLoading } = useBusinessScenarios();
  const { data: report, isLoading: reportLoading, error } = useBusinessComparison(
    activeCompare?.a || '',
    activeCompare?.b || '',
    activeCompare?.scenarioId || ''
  );

  const theme = useTheme();

  React.useEffect(() => {
    if (scenarios && scenarios.length > 0 && !scenarioId) {
      setScenarioId(scenarios[0].id);
    }
  }, [scenarios, scenarioId]);

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

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.xl, paddingBottom: 60 }}>
      {/* Configurator */}
      <Card>
        <VStack gap="md">
          <NativeSelect 
            label="What business are you planning?" 
            value={scenarioId} 
            options={scenarioOptions} 
            onSelect={handleSelectScenario} 
          />
          {scenarioId && scenarios ? (
            <Text variant="small" color="muted">
              {scenarios.find(s => s.id === scenarioId)?.description}
            </Text>
          ) : null}

          <HStack gap="md" style={{ marginTop: theme.spacing.md, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <NativeSelect label="Compare" value={districtA} options={districtOptions} onSelect={handleSelectA} />
            </View>
            <Text variant="subhead" color="muted" style={{ marginTop: 24, marginHorizontal: 4 }}>VS</Text>
            <View style={{ flex: 1 }}>
              <NativeSelect label="With" value={districtB} options={districtOptions} onSelect={handleSelectB} />
            </View>
          </HStack>

          <Pressable 
            disabled={!districtA || !districtB || !scenarioId}
            onPress={() => setActiveCompare({ a: districtA, b: districtB, scenarioId })}
            style={({ pressed, disabled }) => ({
              backgroundColor: disabled ? theme.colors.muted : theme.colors.accent,
              padding: theme.spacing.md,
              borderRadius: theme.roundness.md,
              alignItems: 'center',
              marginTop: theme.spacing.md,
              opacity: pressed ? 0.9 : 1
            })}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Compare</Text>
          </Pressable>
        </VStack>
      </Card>

      {error && activeCompare && (
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
    </ScrollView>
  );
}
