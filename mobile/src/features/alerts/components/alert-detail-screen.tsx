import { useRouter } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { Card, Divider, HStack, Icon, Pressable, Text, VStack } from '@/components/atoms';
import { QueryBoundary, SeverityBadge, SourceNote } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useT } from '@/i18n';
import { openExternal } from '@/lib/external-link';
import { formatDate, formatRelative, formatTime, localise } from '@/lib/format';
import { useLanguage } from '@/stores';
import { useTheme } from '@/theme';

import { useAlert } from '../hooks';

/** One alert in full, including the instruction the issuing authority attached to it. */
export function AlertDetailScreen({ id }: { id: number }) {
  const theme = useTheme();
  const router = useRouter();
  const language = useLanguage();
  const t = useT();
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
                    {t('alertDetail.meta', {
                      type: t(`alertType.${alert.type}`),
                      urgency: t(`urgency.${alert.urgency}`),
                      certainty: t(`certainty.${alert.certainty}`),
                    })}
                  </Text>
                </HStack>

                <Text variant="title">{alert.headline}</Text>

                <Text variant="body" color="textMuted">
                  {alert.body}
                </Text>

                <Divider />

                <VStack gap="xs">
                  <Detail
                    label={t('alertDetail.issued')}
                    value={t('alertDetail.dateTime', {
                      date: formatDate(alert.issuedAt),
                      time: formatTime(alert.issuedAt),
                    })}
                  />
                  {alert.effectiveFrom ? (
                    <Detail
                      label={t('alertDetail.inForceFrom')}
                      value={t('alertDetail.dateTime', {
                        date: formatDate(alert.effectiveFrom),
                        time: formatTime(alert.effectiveFrom),
                      })}
                    />
                  ) : null}
                  {alert.expiresAt ? (
                    <Detail
                      label={t('alertDetail.expires')}
                      value={t('alertDetail.dateTimeRelative', {
                        date: formatDate(alert.expiresAt),
                        time: formatTime(alert.expiresAt),
                        relative: formatRelative(alert.expiresAt),
                      })}
                    />
                  ) : null}
                  <Detail label={t('alertDetail.authority')} value={alert.authority} />
                </VStack>
              </VStack>
            </Card>

            {alert.instruction ? (
              <Card
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor: theme.colors.severity[alert.severity],
                }}
              >
                <VStack gap="xs">
                  <HStack align="center" gap="xs">
                    <Icon name="information-circle-outline" size={16} tone="danger" />
                    <Text variant="footnote" color="textMuted">
                      {t('alertDetail.whatToDo')}
                    </Text>
                  </HStack>
                  <Text variant="body">{alert.instruction}</Text>
                </VStack>
              </Card>
            ) : null}

            {alert.areas.length > 0 ? (
              <VStack gap="sm">
                <Text variant="heading">{t('alertDetail.affectedAreas')}</Text>
                <Card padding="md">
                  {alert.areas.map((area, index) => (
                    <VStack key={area.slug}>
                      {index > 0 ? <Divider /> : null}
                      <Pressable
                        onPress={() => router.push(`/districts/${area.slug}`)}
                        accessibilityLabel={t('alertDetail.openArea', {
                          name: localise(area.name, language),
                        })}
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
                    onPress={() => void openExternal(alert.webUrl as string)}
                    accessibilityLabel={t('alertDetail.originalNoticeLabel')}
                    style={{ minHeight: 0 }}
                  >
                    <HStack align="center" gap="xs">
                      <Icon name="open-outline" size={14} tone="primary" />
                      <Text variant="footnote" color="primary">
                        {t('alertDetail.originalNotice')}
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
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  // The label column scales with the system font, so it keeps its proportion instead of
  // wrapping every label once the reader's text is larger than 1x.
  const labelWidth = 104 * Math.min(fontScale, theme.typography.caption.maxFontScale);

  return (
    <HStack gap="md" align="flex-start">
      <Text variant="caption" color="textMuted" style={{ width: labelWidth }}>
        {label}
      </Text>
      <Text variant="caption" style={{ flex: 1 }}>
        {value}
      </Text>
    </HStack>
  );
}
