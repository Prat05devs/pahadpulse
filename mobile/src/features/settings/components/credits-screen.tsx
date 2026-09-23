import { Card, Divider, Pressable, Text, VStack } from '@/components/atoms';
import { SectionHeader } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useSources, type Source } from '@/features/sources';
import { useT, type TranslationKey } from '@/i18n';
import { openExternal } from '@/lib/external-link';
import { useLanguage } from '@/stores';

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

/**
 * One registry row: who published the dataset, and a link to their own page.
 *
 * The link is the point. An app that presents government information has to say where each
 * figure came from and let the reader go and check it — Google Play requires it under the
 * Misleading Claims policy, and it is the same promise the rest of this product makes. The
 * URL comes from the registry the figures are stamped with, so it cannot drift from them.
 */
function OfficialSource({ source, language }: { source: Source; language: 'en' | 'hi' }) {
  const t = useT();
  const department = source.department[language];

  return (
    <VStack gap="xs">
      <Text variant="bodyStrong">{department}</Text>
      <Text variant="caption" color="textMuted">
        {source.licence}
      </Text>
      {source.url !== null ? (
        <Pressable
          accessibilityRole="link"
          accessibilityHint={t('credits.official.openHint')}
          onPress={() => {
            void openExternal(source.url as string);
          }}
        >
          <Text variant="caption" color="primary">
            {source.url}
          </Text>
        </Pressable>
      ) : null}
    </VStack>
  );
}

export function CreditsScreen() {
  const t = useT();
  const language = useLanguage();
  const sources = useSources();

  return (
    <Screen>
      <VStack gap="lg">
        <VStack gap="xs">
          <Text variant="title">{t('credits.title')}</Text>
          <Text variant="body" color="textMuted">
            {t('credits.intro')}
          </Text>
        </VStack>

        {/* First, before any figure is credited: whose app this is not. */}
        <Card padding="md" tone="muted">
          <VStack gap="xs">
            <Text variant="bodyStrong">{t('credits.disclaimer.title')}</Text>
            <Text variant="caption" color="textMuted">
              {t('credits.disclaimer.body')}
            </Text>
          </VStack>
        </Card>

        <VStack gap="sm">
          <SectionHeader
            title={t('credits.official.title')}
            subtitle={t('credits.official.subtitle')}
          />
          <Card padding="md">
            {sources.isPending ? (
              <Text variant="caption" color="textMuted">
                {t('credits.official.loading')}
              </Text>
            ) : sources.isError || sources.data === undefined ? (
              <Text variant="caption" color="textMuted">
                {t('credits.official.failed')}
              </Text>
            ) : (
              sources.data.map((source, index) => (
                <VStack key={source.key} gap="xs">
                  {index > 0 ? <Divider /> : null}
                  <OfficialSource source={source} language={language} />
                </VStack>
              ))
            )}
          </Card>
        </VStack>

        <VStack gap="sm">
          <SectionHeader title={t('credits.contact.title')} />
          <Card padding="md">
            <VStack gap="xs">
              <Text variant="caption" color="textMuted">
                {t('credits.contact.body')}
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => {
                  void openExternal(`mailto:${t('credits.contact.email')}`);
                }}
              >
                <Text variant="bodyStrong" color="primary">
                  {t('credits.contact.email')}
                </Text>
              </Pressable>
            </VStack>
          </Card>
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
