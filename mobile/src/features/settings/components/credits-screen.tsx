import { Card, Divider, Text, VStack } from '@/components/atoms';
import { SectionHeader } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useT, type TranslationKey } from '@/i18n';

/**
 * Where the data and the map come from.
 *
 * This screen is why the map itself carries no permanent caption. OpenStreetMap's licence
 * asks that the credit be reachable, not that it sit on top of the map — and a two-line
 * caption across the terrain covers the thing it is crediting. The (i) control on the map
 * opens the same credit, and this is its full form.
 */
/**
 * Source names stay as published — "OpenStreetMap" is a proper noun in any language, and a
 * translated licence name would no longer identify the licence. Only our own descriptions of
 * them are translated.
 */
type Credit = { title: string; detailKey: TranslationKey; licenceKey: TranslationKey };

const MAP_SOURCES: Credit[] = [
  {
    title: 'OpenStreetMap',
    detailKey: 'credits.osm.detail',
    licenceKey: 'credits.licence.odbl',
  },
  {
    title: 'AWS Terrain Tiles',
    detailKey: 'credits.terrain.detail',
    licenceKey: 'credits.licence.publicDataset',
  },
  {
    title: 'OpenFreeMap',
    detailKey: 'credits.openfreemap.detail',
    licenceKey: 'credits.licence.freeNoKey',
  },
  {
    title: 'MapLibre GL',
    detailKey: 'credits.maplibre.detail',
    licenceKey: 'credits.licence.bsd',
  },
];

const DATA_SOURCES: Credit[] = [
  {
    title: 'India Meteorological Department, and SACHET / NDMA',
    detailKey: 'credits.imd.detail',
    licenceKey: 'credits.licence.govIndia',
  },
  {
    title: 'Open-Meteo',
    detailKey: 'credits.openMeteo.detail',
    licenceKey: 'credits.licence.nonCommercial',
  },
];

export function CreditsScreen() {
  const t = useT();

  return (
    <Screen>
      <VStack gap="lg">
        <VStack gap="xs">
          <Text variant="title">{t('credits.title')}</Text>
          <Text variant="body" color="textMuted">
            {t('credits.intro')}
          </Text>
        </VStack>

        <VStack gap="sm">
          <SectionHeader title={t('credits.map.title')} subtitle={t('credits.map.subtitle')} />
          <Card padding="md">
            {MAP_SOURCES.map((source, index) => (
              <VStack key={source.title} gap="xs">
                {index > 0 ? <Divider /> : null}
                <Text variant="bodyStrong">{source.title}</Text>
                <Text variant="caption" color="textMuted">
                  {t(source.detailKey)}
                </Text>
                <Text variant="caption" color="textMuted">
                  {t(source.licenceKey)}
                </Text>
              </VStack>
            ))}
          </Card>
        </VStack>

        <VStack gap="sm">
          <SectionHeader
            title={t('credits.figures.title')}
            subtitle={t('credits.figures.subtitle')}
          />
          <Card padding="md">
            {DATA_SOURCES.map((source, index) => (
              <VStack key={source.title} gap="xs">
                {index > 0 ? <Divider /> : null}
                <Text variant="bodyStrong">{source.title}</Text>
                <Text variant="caption" color="textMuted">
                  {t(source.detailKey)}
                </Text>
                <Text variant="caption" color="textMuted">
                  {t(source.licenceKey)}
                </Text>
              </VStack>
            ))}
          </Card>
        </VStack>
      </VStack>
    </Screen>
  );
}
