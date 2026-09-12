import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';

import { Card, Divider, HStack, Icon, Pressable, Text, VStack } from '@/components/atoms';
import { QueryBoundary, SeverityBadge, SourceNote } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { formatDate, formatRelative, formatTime, humanise, localise } from '@/lib/format';
import { useLanguage } from '@/stores';
import { useTheme } from '@/theme';

import { useAlert } from '../hooks';

/** One alert in full, including the instruction the issuing authority attached to it. */
export function AlertDetailScreen({ id }: { id: number }) {
  const theme = useTheme();
  const router = useRouter();
  const language = useLanguage();
  const query = useAlert(id);

  return (
    <Screen onRefresh={query.refetch} refreshing={query.isRefetching}>
      <QueryBoundary query={query}>
        {(alert) => (
          <VStack gap="lg">
            <Card>
              <VStack gap="md">
                <HStack gap="sm" align="center" wrap>
                  <SeverityBadge severity={alert.severity} />
                  <Text variant="footnote" color="textMuted">
                    {`${humanise(alert.type)} · ${humanise(alert.urgency)} · ${humanise(alert.certainty)}`}
                  </Text>
                </HStack>

                <Text variant="title">{alert.headline}</Text>

                <Text variant="body" color="textMuted">
                  {alert.body}
                </Text>

                <Divider />

                <VStack gap="xs">
                  <Detail label="Issued" value={`${formatDate(alert.issuedAt)}, ${formatTime(alert.issuedAt)}`} />
                  {alert.effectiveFrom ? (
                    <Detail
                      label="In force from"
                      value={`${formatDate(alert.effectiveFrom)}, ${formatTime(alert.effectiveFrom)}`}
                    />
                  ) : null}
                  {alert.expiresAt ? (
                    <Detail
                      label="Expires"
                      value={`${formatDate(alert.expiresAt)}, ${formatTime(alert.expiresAt)} (${formatRelative(alert.expiresAt)})`}
                    />
                  ) : null}
                  <Detail label="Authority" value={alert.authority} />
                </VStack>
              </VStack>
            </Card>

            {alert.instruction ? (
              <Card style={{ borderLeftWidth: 4, borderLeftColor: theme.colors.severity[alert.severity] }}>
                <VStack gap="xs">
                  <HStack align="center" gap="xs">
                    <Icon name="information-circle-outline" size={16} tone="danger" />
                    <Text variant="footnote" color="textMuted">
                      WHAT TO DO
                    </Text>
                  </HStack>
                  <Text variant="body">{alert.instruction}</Text>
                </VStack>
              </Card>
            ) : null}

            {alert.areas.length > 0 ? (
              <VStack gap="sm">
                <Text variant="heading">Affected areas</Text>
                <Card padding="md">
                  {alert.areas.map((area, index) => (
                    <VStack key={area.slug}>
                      {index > 0 ? <Divider /> : null}
                      <Pressable
                        onPress={() => router.push(`/districts/${area.slug}`)}
                        accessibilityLabel={`Open ${localise(area.name, language)}`}
                      >
                        <HStack align="center" gap="sm" paddingY="md">
                          <Icon name="location-outline" size={16} tone="textMuted" />
                          <Text variant="body" style={{ flex: 1 }}>
                            {localise(area.name, language)}
                          </Text>
                          <Icon name="chevron-forward" size={15} tone="textMuted" />
                        </HStack>
                      </Pressable>
                    </VStack>
                  ))}
                </Card>
              </VStack>
            ) : null}

            <Card tone="muted" elevation="none">
              <VStack gap="sm">
                <SourceNote provenance={alert.provenance} />
                {alert.webUrl ? (
                  <Pressable
                    onPress={() => void WebBrowser.openBrowserAsync(alert.webUrl as string)}
                    accessibilityLabel="Open the original notice"
                    style={{ minHeight: 0 }}
                  >
                    <HStack align="center" gap="xs">
                      <Icon name="open-outline" size={14} tone="primary" />
                      <Text variant="footnote" color="primary">
                        Read the original notice
                      </Text>
                    </HStack>
                  </Pressable>
                ) : null}
              </VStack>
            </Card>
          </VStack>
        )}
      </QueryBoundary>
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <HStack gap="md" align="flex-start">
      <Text variant="caption" color="textMuted" style={{ width: 104 }}>
        {label}
      </Text>
      <Text variant="caption" style={{ flex: 1 }}>
        {value}
      </Text>
    </HStack>
  );
}
