import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import {
  Badge,
  Card,
  Divider,
  Eyebrow,
  HStack,
  Icon,
  Pressable,
  Text,
  VStack,
} from '@/components/atoms';
import {
  ActionButton,
  LoadingState,
  QueryBoundary,
  SectionHeader,
} from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useT, type TranslationKey } from '@/i18n';
import { callNumber, openDirections, openExternal } from '@/lib/external-link';
import { formatDate, formatNumber } from '@/lib/format';
import { useLanguage } from '@/stores';
import { useTheme } from '@/theme';

import { usePilgrimArrivals, useTourismGuide } from '../hooks';
import type { TourismGuide } from '../pilgrim-schemas';
import { PilgrimArrivalsSection } from './pilgrim-arrivals-section';
import { PlaceCard } from './place-card';

const REGISTRATION_URL = 'https://registrationandtouristcare.uk.gov.in/';

const TRIP_DESK: {
  icon: 'shield-checkmark-outline' | 'git-branch-outline' | 'heart-outline';
  title: TranslationKey;
  body: TranslationKey;
}[] = [
  {
    icon: 'shield-checkmark-outline',
    title: 'guide.desk.register',
    body: 'guide.desk.register.body',
  },
  { icon: 'git-branch-outline', title: 'guide.desk.recheck', body: 'guide.desk.recheck.body' },
  { icon: 'heart-outline', title: 'guide.desk.altitude', body: 'guide.desk.altitude.body' },
];

type Dham = TourismGuide['charDham'][number];

function DhamCard({ place, index }: { place: Dham; index: number }) {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
  const language = useLanguage();

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View>
        <Image
          source={{ uri: place.imageUrl }}
          style={{ width: '100%', height: 190, backgroundColor: theme.colors.surfaceMuted }}
          contentFit="cover"
          transition={200}
          accessibilityLabel={place.imageAlt}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.xl,
            paddingBottom: theme.spacing.md,
            backgroundColor: theme.colors.scrim,
          }}
        >
          <Eyebrow ink={theme.colors.hero.inkMuted}>
            {`0${index + 1} · ${place.district} · ${formatNumber(place.altitudeM)} m`}
          </Eyebrow>
          <Text variant="title" style={{ color: theme.colors.hero.ink }}>
            {language === 'hi' ? place.nameHi : place.name}
          </Text>
        </View>
      </View>
      <VStack gap="sm" padding="md">
        <HStack gap="sm" align="flex-start">
          <Icon name="calendar-outline" size={18} tone="primary" />
          <VStack gap="xxs" grow>
            <Text variant="bodyStrong">{t('guide.season')}</Text>
            <Text variant="caption" color="textMuted">
              {place.bestSeason}
            </Text>
          </VStack>
        </HStack>
        <Text variant="caption">{place.access}</Text>
        <HStack gap="xs" wrap>
          <ActionButton
            label={t('guide.checkConditions')}
            icon="calendar-outline"
            tone="primary"
            onPress={() => router.push({ pathname: '/trip-check', params: { to: place.slug } })}
          />
          <ActionButton
            label={t('guide.directions')}
            icon="navigate-outline"
            onPress={() => void openDirections(place.mapDestination)}
          />
          <ActionButton
            label={t('guide.officialGuide')}
            icon="open-outline"
            onPress={() => void openExternal(place.officialUrl)}
          />
        </HStack>
      </VStack>
    </Card>
  );
}

function HelplinesCard({ guide }: { guide: TourismGuide }) {
  const t = useT();
  return (
    <Card tone="muted" elevation="none">
      <VStack gap="sm">
        <HStack gap="sm" align="center">
          <Icon name="call-outline" tone="primary" />
          <Text variant="heading">{t('guide.help.title')}</Text>
        </HStack>
        <Text variant="footnote" color="textMuted">
          {t('guide.help.yatra')}
        </Text>
        <HStack gap="xs" wrap>
          {guide.helplines.yatra.map((number) => (
            <ActionButton
              key={number}
              label={number}
              icon="call-outline"
              onPress={() => void callNumber(number)}
            />
          ))}
        </HStack>
        <Text variant="footnote" color="textMuted">
          {t('guide.help.emergency')}
        </Text>
        <ActionButton
          label={guide.helplines.emergency}
          icon="call"
          tone="danger"
          onPress={() => void callNumber(guide.helplines.emergency)}
        />
        <Text variant="footnote" color="textMuted">
          {t('guide.help.note')}
        </Text>
      </VStack>
    </Card>
  );
}

/**
 * The Char Dham and Uttarakhand travel guide - the mobile form of the web's /tourism page.
 *
 * Ordered by what a traveller does: register, pick a dham, check conditions for their date,
 * prepare, and only then look at published visitor history (which is annual, never live).
 */
export function TourismScreen() {
  const t = useT();
  const theme = useTheme();
  const guide = useTourismGuide();
  const arrivals = usePilgrimArrivals();

  return (
    <Screen
      onRefresh={() => {
        void guide.refetch();
        void arrivals.refetch();
      }}
      refreshing={guide.isRefetching}
    >
      <QueryBoundary
        query={guide}
        loading={<LoadingState label={t('guide.loading')} />}
        isEmpty={(data) => data.charDham.length === 0}
        emptyTitle={t('guide.empty')}
      >
        {(data) => {
          const hero =
            data.charDham.find((place) => place.slug === 'kedarnath') ?? data.charDham[0];
          return (
            <VStack gap="xl">
              {/* Hero */}
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {hero ? (
                  <Image
                    source={{ uri: hero.imageUrl }}
                    style={{
                      width: '100%',
                      height: 170,
                      backgroundColor: theme.colors.surfaceMuted,
                    }}
                    contentFit="cover"
                    accessibilityLabel={hero.imageAlt}
                  />
                ) : null}
                <VStack
                  gap="sm"
                  padding="lg"
                  style={{ backgroundColor: theme.colors.hero.start }}
                >
                  <Eyebrow ink={theme.colors.hero.statusClear}>{t('guide.eyebrow')}</Eyebrow>
                  <Text variant="title" style={{ color: theme.colors.hero.ink }}>
                    {t('guide.title')}
                  </Text>
                  <Text variant="body" style={{ color: theme.colors.hero.inkMuted }}>
                    {t('guide.intro')}
                  </Text>
                  <ActionButton
                    label={t('guide.register')}
                    icon="shield-checkmark-outline"
                    block
                    onPress={() => void openExternal(REGISTRATION_URL)}
                  />
                  <Text variant="footnote" style={{ color: theme.colors.hero.inkMuted }}>
                    {t('guide.helpLine', {
                      yatra: data.helplines.yatra.join(' · '),
                      emergency: data.helplines.emergency,
                    })}
                  </Text>
                </VStack>
              </Card>

              <VStack gap="md">
                <SectionHeader
                  title={t('guide.rules.title')}
                  subtitle={t('guide.rules.subtitle')}
                />
                {TRIP_DESK.map((item, index) => (
                  <Card
                    key={item.title}
                    tone={index === 0 ? 'primary' : index === 1 ? 'accent' : 'success'}
                    elevation="none"
                    padding="md"
                  >
                    <HStack gap="md" align="flex-start">
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: theme.radius.md,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor:
                            index === 0
                              ? theme.colors.primary
                              : index === 1
                                ? theme.colors.accent
                                : theme.colors.success,
                        }}
                      >
                        <Icon name={item.icon} size={20} tone="textInverse" />
                      </View>
                      <VStack gap="xxs" grow>
                        <Eyebrow
                          color={index === 1 ? 'accent' : index === 2 ? 'success' : 'primary'}
                        >
                          {t('guide.rule', { number: index + 1 })}
                        </Eyebrow>
                        <Text variant="bodyStrong">{t(item.title)}</Text>
                        <Text variant="caption" color="textMuted">
                          {t(item.body)}
                        </Text>
                      </VStack>
                    </HStack>
                  </Card>
                ))}
              </VStack>

              <VStack gap="md">
                <SectionHeader
                  title={t('guide.dhams.title')}
                  subtitle={t('guide.dhams.subtitle')}
                />
                {data.charDham.map((place, index) => (
                  <DhamCard key={place.slug} place={place} index={index} />
                ))}
              </VStack>

              <VStack gap="md">
                <SectionHeader
                  title={t('guide.pilgrimages.title')}
                  subtitle={t('guide.pilgrimages.subtitle')}
                />
                {data.pilgrimages.map((place) => (
                  <PlaceCard key={place.slug} place={place} />
                ))}
              </VStack>

              <VStack gap="md">
                <SectionHeader
                  title={t('guide.prepare.title')}
                  subtitle={t('guide.prepare.subtitle')}
                />
                <Card padding="md">
                  <VStack gap="sm">
                    {data.guidelines.map((item) => (
                      <HStack key={item} gap="sm" align="flex-start">
                        <Icon name="checkmark-circle" size={18} tone="primary" />
                        <Text variant="caption" style={{ flex: 1 }}>
                          {item}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </Card>
                <HelplinesCard guide={data} />
              </VStack>

              <VStack gap="md">
                <SectionHeader
                  title={t('guide.arrivals.title')}
                  subtitle={t('guide.arrivals.subtitle')}
                />
                <PilgrimArrivalsSection />
              </VStack>

              <VStack gap="md">
                <SectionHeader
                  title={t('guide.explore.title')}
                  subtitle={t('guide.explore.subtitle')}
                />
                {data.destinations.map((place) => (
                  <PlaceCard key={place.slug} place={place} />
                ))}
              </VStack>

              <VStack gap="sm">
                <SectionHeader
                  title={t('guide.desk.title')}
                  subtitle={t('guide.desk.subtitle')}
                />
                <Card tone="primary" elevation="none" padding="md">
                  <HStack
                    gap="sm"
                    align="flex-start"
                    style={{ marginBottom: theme.spacing.md }}
                  >
                    <Icon name="shield-checkmark-outline" tone="primary" />
                    <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
                      {t('guide.desk.provenance')}
                    </Text>
                  </HStack>
                  {data.officialLinks.map((link, index) => (
                    <VStack key={link.url} gap="sm">
                      {index > 0 ? <Divider /> : null}
                      <Pressable
                        onPress={() => void openExternal(link.url)}
                        accessibilityRole="link"
                        accessibilityLabel={link.label}
                        style={{ minHeight: 44 }}
                      >
                        <HStack gap="md" align="center">
                          <Icon
                            name={
                              link.kind === 'map'
                                ? 'map-outline'
                                : link.kind === 'primary'
                                  ? 'shield-checkmark-outline'
                                  : 'document-text-outline'
                            }
                            tone="primary"
                          />
                          <VStack gap="xxs" grow>
                            <HStack gap="xs" align="center">
                              <Text variant="bodyStrong">{link.label}</Text>
                              {link.kind === 'primary' ? (
                                <Badge label={t('guide.desk.start')} tone="success" />
                              ) : null}
                            </HStack>
                            <Text variant="caption" color="textMuted">
                              {link.description}
                            </Text>
                          </VStack>
                          <Icon name="open-outline" size={16} tone="textMuted" />
                        </HStack>
                      </Pressable>
                    </VStack>
                  ))}
                </Card>
                <Text variant="footnote" color="textMuted">
                  {t('guide.verified', { date: formatDate(data.verifiedOn) })}
                </Text>
              </VStack>

              <Text variant="footnote" color="textMuted" align="center">
                {t('guide.disclaimer')}
              </Text>
            </VStack>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}
