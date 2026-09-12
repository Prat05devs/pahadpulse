import { Card, Divider, Text, VStack } from '@/components/atoms';
import { SectionHeader } from '@/components/molecules';
import { Screen } from '@/components/templates';

/**
 * Where the data and the map come from.
 *
 * This screen is why the map itself carries no permanent caption. OpenStreetMap's licence
 * asks that the credit be reachable, not that it sit on top of the map — and a two-line
 * caption across the terrain covers the thing it is crediting. The (i) control on the map
 * opens the same credit, and this is its full form.
 */
const MAP_SOURCES = [
  {
    title: 'OpenStreetMap',
    detail:
      'District boundaries, and the highway numbers the NH and SH layers are matched on. Collected by OpenStreetMap contributors and queried through Overpass.',
    licence: 'Open Database Licence (ODbL)',
  },
  {
    title: 'AWS Terrain Tiles',
    detail:
      'The elevation model behind the hillshade and the 3D view. Served from the AWS public dataset registry, originally from Mapzen.',
    licence: 'Public dataset, keyless',
  },
  {
    title: 'OpenFreeMap',
    detail: 'The vector basemap the districts and highways are drawn over.',
    licence: 'Free, no API key',
  },
  {
    title: 'MapLibre GL',
    detail:
      'The renderer, used by both this app and the web portal so the two maps read the same way.',
    licence: 'BSD-3-Clause',
  },
];

const DATA_SOURCES = [
  {
    title: 'India Meteorological Department, and SACHET / NDMA',
    detail: 'Weather warnings and disaster alerts, as published in CAP format.',
    licence: 'Government of India',
  },

  {
    title: 'Open-Meteo',
    detail: 'Observations and forecasts for the station nearest each district.',
    licence: 'Free for non-commercial use',
  },
];

export function CreditsScreen() {
  return (
    <Screen>
      <VStack gap="lg">
        <VStack gap="xs">
          <Text variant="title">Data and technology</Text>
          <Text variant="body" color="textMuted">
            Every figure in this app is published by someone else, and this is who. Nothing
            here is modelled or estimated by us.
          </Text>
        </VStack>

        <VStack gap="sm">
          <SectionHeader title="The map" subtitle="Keyless, and not Google Maps" />
          <Card padding="md">
            {MAP_SOURCES.map((source, index) => (
              <VStack key={source.title} gap="xs">
                {index > 0 ? <Divider /> : null}
                <Text variant="bodyStrong">{source.title}</Text>
                <Text variant="caption" color="textMuted">
                  {source.detail}
                </Text>
                <Text variant="caption" color="textMuted">
                  {source.licence}
                </Text>
              </VStack>
            ))}
          </Card>
        </VStack>

        <VStack gap="sm">
          <SectionHeader title="The figures" subtitle="Departments that publish them" />
          <Card padding="md">
            {DATA_SOURCES.map((source, index) => (
              <VStack key={source.title} gap="xs">
                {index > 0 ? <Divider /> : null}
                <Text variant="bodyStrong">{source.title}</Text>
                <Text variant="caption" color="textMuted">
                  {source.detail}
                </Text>
                <Text variant="caption" color="textMuted">
                  {source.licence}
                </Text>
              </VStack>
            ))}
          </Card>
        </VStack>
      </VStack>
    </Screen>
  );
}
