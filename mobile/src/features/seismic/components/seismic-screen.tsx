import * as WebBrowser from 'expo-web-browser';

import {
  Badge,
  Card,
  Divider,
  HStack,
  Icon,
  Pressable,
  Text,
  VStack,
} from '@/components/atoms';
import { EmptyState, LoadingState, QueryBoundary, SectionHeader } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { formatDate, formatTime, humanise } from '@/lib/format';

import { useRecentSeismic } from '../hooks';

export function SeismicScreen() {
  const seismic = useRecentSeismic();

  return (
    <Screen onRefresh={() => void seismic.refetch()} refreshing={seismic.isRefetching}>
      <QueryBoundary query={seismic} loading={<LoadingState label="Loading seismic data" />}>
        {(data) => (
          <VStack gap="lg">
            <Card padding="lg">
              <VStack gap="sm">
                <Text variant="footnote" color="textMuted">
                  LAST 30 DAYS
                </Text>
                <Text variant="metric" color="primary">
                  {data.countLast30Days}
                </Text>
                <Text variant="body" color="textMuted">
                  {data.countLast30Days === 0
                    ? 'No earthquakes recorded in Uttarakhand.'
                    : `${data.countLast30Days} earthquake${data.countLast30Days === 1 ? '' : 's'} recorded${data.largest ? `; largest M${data.largest.magnitude.toFixed(1)} near ${data.largest.place}` : ''}.`}
                </Text>
              </VStack>
            </Card>

            <Card tone="muted" elevation="none">
              <HStack gap="sm" align="flex-start">
                <Icon name="information-circle-outline" tone="primary" />
                <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
                  These events have already happened. Earthquakes cannot be predicted, and
                  automatic solutions may be revised.
                </Text>
              </HStack>
            </Card>

            <VStack gap="sm">
              <SectionHeader
                title="Recorded events"
                subtitle="Magnitude, time, depth and review status"
              />
              {data.events.length === 0 ? (
                <EmptyState title="No recent events" />
              ) : (
                <Card padding="md">
                  {data.events.map((event, index) => (
                    <VStack key={event.id} gap="sm">
                      {index > 0 ? <Divider /> : null}
                      <HStack gap="md" align="flex-start">
                        <VStack align="center" gap="xxs">
                          <Text
                            variant="metric"
                            color={event.magnitude >= 4.5 ? 'danger' : 'accent'}
                          >
                            {event.magnitude.toFixed(1)}
                          </Text>
                          <Badge
                            label={humanise(event.band)}
                            tone={event.magnitude >= 4.5 ? 'danger' : 'neutral'}
                          />
                        </VStack>
                        <VStack gap="xs" style={{ flex: 1 }}>
                          <Text variant="bodyStrong">{event.place}</Text>
                          <Text variant="caption" color="textMuted">
                            {formatDate(event.occurredAt)} · {formatTime(event.occurredAt)} IST
                          </Text>
                          <Text variant="caption" color="textMuted">
                            {event.depthKm === null
                              ? 'Depth not reported'
                              : `${event.depthKm.toFixed(0)} km deep`}{' '}
                            · {event.magnitudeType ?? 'magnitude type unknown'} ·{' '}
                            {event.reviewStatus ?? 'review status unknown'}
                          </Text>
                          {event.webUrl ? (
                            <Pressable
                              onPress={() => void WebBrowser.openBrowserAsync(event.webUrl!)}
                              accessibilityLabel={`Open source record for magnitude ${event.magnitude} earthquake`}
                              style={{ minHeight: 0 }}
                            >
                              <Text variant="footnote" color="primary">
                                Open event record
                              </Text>
                            </Pressable>
                          ) : null}
                        </VStack>
                      </HStack>
                    </VStack>
                  ))}
                </Card>
              )}
            </VStack>

            {data.source ? (
              <Pressable
                onPress={() => void WebBrowser.openBrowserAsync(data.source!.url)}
                accessibilityLabel={`Source: ${data.source.department.en}. Opens in a browser.`}
                style={{ minHeight: 0 }}
              >
                <Text variant="caption" color="textMuted">
                  {data.source.attribution} ↗
                </Text>
              </Pressable>
            ) : null}
          </VStack>
        )}
      </QueryBoundary>
    </Screen>
  );
}
