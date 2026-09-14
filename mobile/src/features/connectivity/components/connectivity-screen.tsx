import { useMemo, useState } from 'react';

import { Badge, Card, Divider, HStack, Icon, Text, VStack } from '@/components/atoms';
import {
  Chip,
  LoadingState,
  QueryBoundary,
  SectionHeader,
  SourceNote,
} from '@/components/molecules';
import { Screen } from '@/components/templates';
import { formatDate, formatNumber, localise } from '@/lib/format';
import { useLanguage } from '@/stores';

import { useStateNetwork } from '../hooks';
import type { ConnectionKind } from '../schemas';

const KIND_LABEL: Record<ConnectionKind, string> = {
  fixed: 'Fixed broadband',
  mobile: 'Mobile',
};

export function ConnectivityScreen() {
  const language = useLanguage();
  const [kind, setKind] = useState<ConnectionKind>('fixed');
  const network = useStateNetwork();

  const rows = useMemo(
    () =>
      (network.data?.districts ?? [])
        .map((district) => ({
          district,
          connection: district.connections.find((entry) => entry.kind === kind),
        }))
        .filter(
          (row): row is typeof row & { connection: NonNullable<typeof row.connection> } =>
            row.connection !== undefined
        )
        .sort((a, b) => b.connection.downloadMbps - a.connection.downloadMbps),
    [kind, network.data]
  );

  return (
    <Screen onRefresh={() => void network.refetch()} refreshing={network.isRefetching}>
      <QueryBoundary
        query={network}
        loading={<LoadingState label="Loading network data" />}
        isEmpty={(data) => data.spread.length === 0}
        emptyTitle="No network measurements"
      >
        {(data) => {
          const names = new Map(
            data.districts.map((district) => [district.slug, localise(district.name, language)])
          );
          const source =
            data.districts
              .flatMap((district) => district.connections)
              .find((connection) => connection.provenance)?.provenance ?? null;

          return (
            <VStack gap="lg">
              <Card tone="muted" elevation="none">
                <Text variant="body" color="textMuted">
                  These figures show what people who ran Speedtest actually received. They do
                  not say whether every village has a connection.
                </Text>
              </Card>

              <VStack gap="sm">
                <SectionHeader
                  title="State spread"
                  subtitle={
                    data.quarterStart
                      ? `Measurements for ${formatDate(data.quarterStart)}`
                      : 'Latest measured quarter'
                  }
                />
                {data.spread.map((spread) => (
                  <Card key={spread.kind} padding="md">
                    <VStack gap="sm">
                      <HStack justify="space-between" align="center">
                        <Text variant="bodyStrong">{KIND_LABEL[spread.kind]}</Text>
                        <Badge label={`${spread.ratio.toFixed(1)}× spread`} tone="primary" />
                      </HStack>
                      <Text variant="metric" color="primary">
                        {spread.stateAverageMbps.toFixed(1)} Mbps
                      </Text>
                      <Text variant="caption" color="textMuted">
                        State average across {spread.districtsMeasured} measured districts
                      </Text>
                      <Divider />
                      <Text variant="caption">
                        Fastest: {names.get(spread.fastest.slug) ?? spread.fastest.slug} ·{' '}
                        {spread.fastest.downloadMbps.toFixed(1)} Mbps
                      </Text>
                      <Text variant="caption">
                        Slowest: {names.get(spread.slowest.slug) ?? spread.slowest.slug} ·{' '}
                        {spread.slowest.downloadMbps.toFixed(1)} Mbps
                      </Text>
                    </VStack>
                  </Card>
                ))}
              </VStack>

              <VStack gap="sm">
                <SectionHeader
                  title="District ranking"
                  subtitle="Download, upload, latency and sample size"
                />
                <HStack gap="xs" wrap>
                  <Chip
                    label="Fixed broadband"
                    selected={kind === 'fixed'}
                    onPress={() => setKind('fixed')}
                  />
                  <Chip
                    label="Mobile"
                    selected={kind === 'mobile'}
                    onPress={() => setKind('mobile')}
                  />
                </HStack>
                <Card padding="md">
                  {rows.map(({ district, connection }, index) => (
                    <VStack key={district.slug} gap="sm">
                      {index > 0 ? <Divider /> : null}
                      <HStack justify="space-between" align="center" gap="sm">
                        <HStack gap="sm" align="center" style={{ flex: 1 }}>
                          <Text variant="footnote" color="textMuted" tabular>
                            {index + 1}
                          </Text>
                          <VStack gap="xxs" style={{ flex: 1 }}>
                            <Text variant="bodyStrong">
                              {localise(district.name, language)}
                            </Text>
                            <Text variant="caption" color="textMuted">
                              {connection.uploadMbps.toFixed(1)} Mbps up ·{' '}
                              {connection.latencyMs.toFixed(0)} ms latency
                            </Text>
                          </VStack>
                        </HStack>
                        <Text variant="bodyStrong" color="primary" tabular>
                          {connection.downloadMbps.toFixed(1)} Mbps
                        </Text>
                      </HStack>
                      <HStack gap="xs" align="center" wrap>
                        <Text variant="footnote" color="textMuted">
                          {formatNumber(connection.sample.tests)} tests ·{' '}
                          {formatNumber(connection.sample.devices)} devices
                        </Text>
                        {connection.sample.strength === 'thin' ? (
                          <Badge label="Thin sample" tone="warning" />
                        ) : null}
                      </HStack>
                    </VStack>
                  ))}
                </Card>
              </VStack>

              {data.notMeasured.length > 0 ? (
                <Card tone="muted" elevation="none">
                  <HStack gap="sm" align="flex-start">
                    <Icon name="alert-circle-outline" tone="warning" />
                    <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
                      No measurements this quarter:{' '}
                      {data.notMeasured
                        .map((district) =>
                          localise(
                            { en: district.name.en, hi: district.name.hi ?? '' },
                            language
                          )
                        )
                        .join(', ')}
                      .
                    </Text>
                  </HStack>
                </Card>
              ) : null}
              <Card tone="muted" elevation="none">
                <VStack gap="xs">
                  <Text variant="bodyStrong">How to read this</Text>
                  <Text variant="caption" color="textMuted">
                    Speed tests are self-selected, so they compare measured performance—not
                    universal access. A thin sample should be read cautiously. BharatNet
                    readiness and operator coverage are not loaded yet.
                  </Text>
                </VStack>
              </Card>
              <SourceNote provenance={source} />
            </VStack>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}
