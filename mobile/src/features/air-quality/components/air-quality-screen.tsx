import { Badge, Card, Divider, HStack, Icon, Text, VStack } from '@/components/atoms';
import { EmptyState, LoadingState, QueryBoundary, SectionHeader } from '@/components/molecules';
import { useT } from '@/i18n';
import { Screen } from '@/components/templates';
import { formatRelative, localise } from '@/lib/format';
import { useLanguage } from '@/stores';
import { useTheme } from '@/theme';

import { useAllDistrictAirQuality } from '../hooks';
import type { NationalAqiBand } from '../schemas';

const BAND_LABEL: Record<NationalAqiBand, string> = {
  good: 'Good',
  satisfactory: 'Satisfactory',
  moderate: 'Moderate',
  poor: 'Poor',
  very_poor: 'Very poor',
  severe: 'Severe',
};

const POLLUTANT_LABEL: Record<string, string> = {
  pm2_5_ug_m3: 'PM2.5',
  pm10_ug_m3: 'PM10',
  nitrogen_dioxide_ug_m3: 'NO₂',
  ozone_ug_m3: 'O₃',
  sulphur_dioxide_ug_m3: 'SO₂',
  carbon_monoxide_ug_m3: 'CO',
};

export function AirQualityScreen() {
  const theme = useTheme();
  const t = useT();
  const language = useLanguage();
  const airQuality = useAllDistrictAirQuality();

  return (
    <Screen onRefresh={() => void airQuality.refetch()} refreshing={airQuality.isRefetching}>
      <QueryBoundary query={airQuality} loading={<LoadingState label={t('air.loading')} />}>
        {(entries) => {
          const readings = entries
            .map((entry) => entry.air)
            .filter((reading): reading is NonNullable<typeof reading> => reading !== null)
            .sort((a, b) => (b.nationalAqi?.value ?? -1) - (a.nationalAqi?.value ?? -1));
          const worst = readings.find((reading) => reading.nationalAqi !== null);
          const missing = entries.length - readings.length;

          return (
            <VStack gap="lg">
              {readings.length === 0 ? (
                <EmptyState title={t('air.empty')} message={t('air.emptyMessage')} />
              ) : (
                <>
                  <Card padding="lg">
                    <VStack gap="sm">
                      <Text variant="footnote" color="textMuted">
                        {t('air.statePicture')}
                      </Text>
                      <Text variant="heading">
                        {worst?.nationalAqi
                          ? `${localise(worst.station.name, language)} has the highest available National AQI: ${worst.nationalAqi.value}`
                          : 'National AQI is not available yet'}
                      </Text>
                      <Text variant="caption" color="textMuted">
                        {readings.length} district reading{readings.length === 1 ? '' : 's'}{' '}
                        available{missing > 0 ? t('air.missing', { count: missing }) : ''}
                      </Text>
                    </VStack>
                  </Card>

                  <Card tone="muted" elevation="none">
                    <HStack gap="sm" align="flex-start">
                      <Icon name="information-circle-outline" tone="primary" />
                      <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
                        {t('air.caveat')}
                      </Text>
                    </HStack>
                  </Card>

                  <VStack gap="sm">
                    <SectionHeader
                      title={t('air.byDistrict')}
                      subtitle={t('air.byDistrict.subtitle')}
                    />
                    {readings.map((reading) => {
                      const national = reading.nationalAqi;
                      const dangerous = national
                        ? national.band === 'poor' ||
                          national.band === 'very_poor' ||
                          national.band === 'severe'
                        : false;
                      return (
                        <Card key={reading.station.id} padding="md">
                          <VStack gap="sm">
                            <HStack justify="space-between" align="flex-start" gap="md">
                              <VStack gap="xxs" style={{ flex: 1 }}>
                                <Text variant="bodyStrong">
                                  {localise(reading.station.name, language)}
                                </Text>
                                <Text variant="caption" color="textMuted">
                                  {reading.observedAt
                                    ? t('air.observed', {
                                        when: formatRelative(reading.observedAt),
                                      })
                                    : 'Observation time unavailable'}
                                </Text>
                              </VStack>
                              <VStack align="flex-end" gap="xs">
                                <Text variant="metric" color={dangerous ? 'danger' : 'primary'}>
                                  {national?.value ?? '—'}
                                </Text>
                                <Badge
                                  label={
                                    national ? BAND_LABEL[national.band] : 'Not enough data'
                                  }
                                  tone={dangerous ? 'danger' : 'neutral'}
                                />
                              </VStack>
                            </HStack>
                            <Divider />
                            <HStack gap="lg" wrap>
                              <VStack gap="xxs">
                                <Text variant="footnote" color="textMuted">
                                  PM2.5
                                </Text>
                                <Text variant="bodyStrong" tabular>
                                  {reading.pm25
                                    ? `${reading.pm25.value.toFixed(1)} µg/m³`
                                    : '—'}
                                </Text>
                              </VStack>
                              <VStack gap="xxs">
                                <Text variant="footnote" color="textMuted">
                                  PM10
                                </Text>
                                <Text variant="bodyStrong" tabular>
                                  {reading.pm10
                                    ? `${reading.pm10.value.toFixed(1)} µg/m³`
                                    : '—'}
                                </Text>
                              </VStack>
                              {national ? (
                                <VStack gap="xxs">
                                  <Text variant="footnote" color="textMuted">
                                    {t('air.dominant')}
                                  </Text>
                                  <Text variant="bodyStrong">
                                    {POLLUTANT_LABEL[national.dominantPollutant] ??
                                      national.dominantPollutant}
                                  </Text>
                                </VStack>
                              ) : null}
                            </HStack>
                            {reading.aqi ? (
                              <Text variant="footnote" color="textMuted">
                                US AQI cross-reference: {Math.round(reading.aqi.value)}
                              </Text>
                            ) : null}
                          </VStack>
                        </Card>
                      );
                    })}
                  </VStack>
                  <Text variant="caption" color="textMuted">
                    {readings[0]?.source.attribution}
                  </Text>
                </>
              )}

              <Card
                style={{ borderColor: theme.colors.warning, borderWidth: 1 }}
                elevation="none"
              >
                <Text variant="caption">
                  <Text variant="bodyStrong">{t('air.rivers')}</Text> Until Central Water
                  Commission gauge access is available, the app shows nothing rather than a
                  potentially dangerous estimate.
                </Text>
              </Card>
            </VStack>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}
