import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import {
  Card,
  Eyebrow,
  HStack,
  Icon,
  LiveDot,
  Pressable,
  Text,
  VStack,
  type IconName,
} from '@/components/atoms';
import { ErrorState, LoadingState } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useT, type TranslationKey } from '@/i18n';
import { useLanguage } from '@/stores';
import { useTheme } from '@/theme';

import { DIVISION_COLORS, ROAD_COLORS, SEVERITY_COLORS } from '../constants';
import { useAlertFeatures, useDistrictFeatures } from '../hooks';
import {
  DEFAULT_LAYERS,
  MAP_ATTRIBUTION,
  MAP_LAYERS,
  buildMapHtml,
  type MapLayerKey,
  type MapLayerState,
} from '../map-html';
import { MapMessageSchema } from '../schemas';

/** What each toggle says, and the one-line reason it is worth turning on. */
const LAYER_LABELS: Record<MapLayerKey, TranslationKey> = {
  districts: 'map.layer.districts',
  alerts: 'map.layer.alerts',
  highways: 'map.layer.highways',
};

const LAYER_ICONS: Record<MapLayerKey, IconName> = {
  districts: 'map-outline',
  alerts: 'warning-outline',
  highways: 'car-outline',
};

/**
 * The 3D terrain map of Uttarakhand.
 *
 * It is a WebKit window filling the screen. MapLibre GL JS renders the map natively using
 * WebGL, so it pans at 60fps on both platforms. The alternative - bridging a native mapping
 * SDK into React Native - is slower to build and rarely achieves this framerate without
 * crashing.
 */
export function MapScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const language = useLanguage();
  const t = useT();
  const [ready, setReady] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [layers, setLayers] = useState<MapLayerState>(DEFAULT_LAYERS);
  const [terrain, setTerrain] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [selectedDistrictSlug, setSelectedDistrictSlug] = useState<string | null>(null);
  const webRef = useRef<WebView>(null);

  const districts = useDistrictFeatures();
  const alerts = useAlertFeatures();

  /*
   * Rebuilt only when the data changes. The document embeds ~100 KB of GeoJSON, and
   * rebuilding it on every render would reload the WebView - losing the reader's pan and
   * zoom every time anything else on the screen changed.
   */
  const html = useMemo(
    () =>
      buildMapHtml({
        districts: districts.data ?? null,
        alerts: alerts.data ?? null,
        language,
        palette: {
          background: theme.colors.surfaceMuted,
          text: theme.colors.text,
          labelBackground: theme.colors.surfaceGlassStrong,
          labelBorder: theme.colors.border,
          labelShadow: theme.colors.shadow,
          selection: theme.colors.primary,
          selectionCasing: theme.colors.hero.ink,
        },
      }),
    [districts.data, alerts.data, language, theme]
  );

  /*
   * Toggles are pushed into the live document rather than changing the HTML, which would
   * reload the WebView and discard the reader's pan and zoom. `true;` at the end keeps iOS
   * from warning about a non-serialisable return value.
   */
  const toggleLayer = useCallback((key: MapLayerKey) => {
    setLayers((current) => {
      const next = { ...current, [key]: !current[key] };
      webRef.current?.injectJavaScript(
        `window.ppSetLayers && window.ppSetLayers(${JSON.stringify(next)}); true;`
      );
      return next;
    });
  }, []);

  const zoomBy = useCallback((delta: number) => {
    webRef.current?.injectJavaScript(`window.ppZoom && window.ppZoom(${String(delta)}); true;`);
  }, []);

  /** Back to the whole state. The way out of being lost at high zoom. */
  const resetFrame = useCallback(() => {
    webRef.current?.injectJavaScript('window.ppFrame && window.ppFrame(); true;');
  }, []);

  const toggleTerrain = useCallback(() => {
    setTerrain((on) => {
      const next = !on;
      webRef.current?.injectJavaScript(
        `window.ppSetTerrain && window.ppSetTerrain(${String(next)}); true;`
      );
      return next;
    });
  }, []);

  const clearDistrictSelection = useCallback(() => {
    setSelectedDistrictSlug(null);
    webRef.current?.injectJavaScript(
      'window.ppSelectDistrict && window.ppSelectDistrict(null); true;'
    );
  }, []);

  const selectDistrict = useCallback((slug: string) => {
    setSelectedDistrictSlug(slug);
    webRef.current?.injectJavaScript(
      `window.ppSelectDistrict && window.ppSelectDistrict(${JSON.stringify(slug)}); true;`
    );
  }, []);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      /*
       * A message from the WebView crosses a boundary into code that cannot see how it was
       * produced, so it is validated rather than trusted (N5).
       */
      let raw: unknown = null;
      try {
        raw = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      const parsed = MapMessageSchema.safeParse(raw);
      if (!parsed.success) return;

      const message = parsed.data;
      if (message.type === 'ready') {
        setReady(true);
        return;
      }
      if (message.type === 'error') {
        setDocumentError(message.message);
        return;
      }
      if (message.type === 'alert') {
        router.push(`/alerts/${message.alertId}`);
        return;
      }
      if (message.type === 'clear') {
        clearDistrictSelection();
        return;
      }
      selectDistrict(message.slug);
    },
    [clearDistrictSelection, router, selectDistrict]
  );

  const selectedDistrict = useMemo(
    () =>
      selectedDistrictSlug === null
        ? null
        : (districts.data?.features.find(
            (feature) => feature.properties.slug === selectedDistrictSlug
          ) ?? null),
    [districts.data?.features, selectedDistrictSlug]
  );

  const selectedAlertCount = useMemo(
    () =>
      selectedDistrictSlug === null
        ? 0
        : (alerts.data?.features.filter((feature) =>
            feature.properties.areaSlugs.includes(selectedDistrictSlug)
          ).length ?? 0),
    [alerts.data?.features, selectedDistrictSlug]
  );

  const selectedDistrictName = selectedDistrict
    ? language === 'hi'
      ? selectedDistrict.properties.nameHi || selectedDistrict.properties.nameEn
      : selectedDistrict.properties.nameEn
    : '';
  const selectedDivision = selectedDistrict?.properties.division
    ? t(
        selectedDistrict.properties.division === 'garhwal'
          ? 'districts.garhwal'
          : 'districts.kumaon'
      )
    : null;
  const selectedAlertSummary = alerts.isPending
    ? t('map.selection.alertsLoading')
    : alerts.isError
      ? t('map.selection.alertsUnavailable')
      : selectedAlertCount === 0
        ? t('map.selection.noAlerts')
        : t('map.selection.alerts', { count: selectedAlertCount });
  const mapAlertSummary = alerts.isPending
    ? t('map.status.alertsLoading')
    : alerts.isError
      ? t('map.status.alertsUnavailable')
      : t('map.status.alerts', { count: alerts.data?.features.length ?? 0 });

  if (districts.isPending) {
    return (
      <Screen scroll={false}>
        <LoadingState label={t('map.loading')} />
      </Screen>
    );
  }

  if (districts.isError) {
    return (
      <Screen scroll={false}>
        <ErrorState error={districts.error} onRetry={() => void districts.refetch()} />
      </Screen>
    );
  }

  /*
   * A failure inside the document - the library or the basemap style not loading - is a
   * different failure from the API one above, and the reader can act on it (it is almost
   * always connectivity), so it gets its own message rather than a blank map.
   */
  if (documentError !== null) {
    return (
      <Screen scroll={false}>
        <ErrorState
          error={new Error(documentError)}
          onRetry={() => {
            setDocumentError(null);
            setReady(false);
          }}
        />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceMuted }}>
      <WebView
        ref={webRef}
        // An https origin rather than the default about:blank: MapLibre needs a secure
        // context for its workers, and the library, style and tiles are all https.
        source={{ html, baseUrl: 'https://pahadpulse.local/' }}
        originWhitelist={['*']}
        onMessage={onMessage}
        style={{ flex: 1, backgroundColor: theme.colors.surfaceMuted }}
        // The map owns its gestures; the page itself must not scroll or bounce.
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled
        domStorageEnabled
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('map.label', {
          count: districts.data?.features.length ?? 0,
        })}
      />

      {!ready ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.surfaceMuted,
            },
          ]}
        >
          <LoadingState label={t('map.drawing')} />
        </View>
      ) : null}

      {/* Floating operational chrome keeps the terrain visible while exposing live state. */}
      <VStack
        gap="xs"
        style={{
          position: 'absolute',
          top: insets.top + theme.spacing.sm,
          left: theme.spacing.md,
          right: theme.spacing.md,
        }}
      >
        <Card tone="glass" elevation="medium" padding="sm">
          <HStack gap="sm" align="center">
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: theme.radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.primary,
              }}
            >
              <Icon name="layers-outline" size={21} tone="textInverse" />
            </View>
            <VStack grow gap="xxs">
              <HStack align="center" gap="xs" wrap>
                <Text variant="heading">{t('map.header.title')}</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    paddingHorizontal: theme.spacing.xs + 2,
                    paddingVertical: theme.spacing.xxs,
                    borderRadius: theme.radius.pill,
                    backgroundColor: theme.colors.secondarySubtle,
                  }}
                >
                  <LiveDot tone="fresh" size={6} active={ready} />
                  <Text variant="footnote" weight="bold" color="success">
                    {t('map.live')}
                  </Text>
                </View>
              </HStack>
              <Text variant="footnote" color="textMuted">
                {t('map.header.subtitleStatus', {
                  districts: districts.data?.features.length ?? 0,
                  status: mapAlertSummary,
                })}
              </Text>
            </VStack>
            <MapButton
              label={t('map.credits')}
              icon="information-circle-outline"
              onPress={() => setCreditsOpen(true)}
            />
          </HStack>
        </Card>

        {/* Layer controls remain adjacent to the map region they change. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -theme.spacing.md }}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.md,
            gap: theme.spacing.xs,
          }}
        >
          {MAP_LAYERS.map((key) => (
            <LayerChip
              key={key}
              label={t(LAYER_LABELS[key])}
              icon={LAYER_ICONS[key]}
              active={layers[key]}
              count={
                key === 'alerts' && !alerts.isPending && !alerts.isError
                  ? (alerts.data?.features.length ?? 0)
                  : undefined
              }
              onPress={() => toggleLayer(key)}
            />
          ))}
        </ScrollView>
      </VStack>

      {/*
       * Zoom and reset, stacked above the credits control.
       *
       * Pinch works, but it is not the only way anyone holds a phone - one-handed, gloved,
       * or with limited dexterity, a pinch is awkward or impossible, and on a simulator it
       * is worse. Buttons are the accessible path, not a fallback.
       */}
      <View
        style={{
          position: 'absolute',
          right: theme.spacing.md,
          bottom: insets.bottom + theme.spacing.sm + (selectedDistrict === null ? 76 : 144),
        }}
      >
        <Card tone="glass" elevation="medium" padding="xxs" radius="md">
          <MapModeButton active={terrain} label={t('map.terrain')} onPress={toggleTerrain} />
          <View style={{ height: 1, backgroundColor: theme.colors.separator }} />
          <MapButton label={t('map.zoomIn')} icon="add" onPress={() => zoomBy(1)} />
          <View style={{ height: 1, backgroundColor: theme.colors.separator }} />
          <MapButton label={t('map.zoomOut')} icon="remove" onPress={() => zoomBy(-1)} />
          <View style={{ height: 1, backgroundColor: theme.colors.separator }} />
          <MapButton label={t('map.fitState')} icon="scan-outline" onPress={resetFrame} />
        </Card>
      </View>

      {selectedDistrict === null ? (
        <MapLegend alertSummary={mapAlertSummary} bottom={insets.bottom + theme.spacing.sm} />
      ) : (
        <DistrictPreview
          name={selectedDistrictName}
          division={selectedDivision}
          alertSummary={selectedAlertSummary}
          hasAlerts={selectedAlertCount > 0}
          bottom={insets.bottom + theme.spacing.sm}
          onClose={clearDistrictSelection}
          onOpen={() => router.push(`/districts/${selectedDistrict.properties.slug}`)}
        />
      )}

      {/* Attribution stays one tap away in the header without covering the map. */}
      <Modal
        visible={creditsOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setCreditsOpen(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }} accessibilityViewIsModal>
          <Pressable
            onPress={() => setCreditsOpen(false)}
            accessibilityLabel={t('map.creditsClose')}
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }]}
          />
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radius.lg,
              borderTopRightRadius: theme.radius.lg,
              padding: theme.spacing.lg,
              paddingBottom: insets.bottom + theme.spacing.lg,
              gap: theme.spacing.sm,
            }}
          >
            <HStack justify="space-between" align="center">
              <Text variant="title">{t('map.creditsTitle')}</Text>
              <Pressable
                onPress={() => setCreditsOpen(false)}
                accessibilityLabel={t('map.creditsClose')}
              >
                <Icon name="close" size={24} tone="text" />
              </Pressable>
            </HStack>
            <Text variant="body" color="textMuted">
              {MAP_ATTRIBUTION}
            </Text>
            <Text variant="caption" color="textMuted">
              {t('map.creditsBody')}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** One toggle. Small enough to live here rather than become a shared component. */
function LayerChip({
  label,
  active,
  onPress,
  icon,
  count,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon: IconName;
  count?: number;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 6,
        borderRadius: theme.radius.pill,
        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
        borderWidth: 1,
        borderColor: active ? theme.colors.primary : theme.colors.border,
      }}
    >
      <Icon name={icon} size={15} tone={active ? 'textInverse' : 'textMuted'} />
      <Text variant="caption" color={active ? 'textInverse' : 'text'}>
        {label}
      </Text>
      {count !== undefined ? (
        <View
          style={{
            minWidth: 20,
            height: 20,
            paddingHorizontal: theme.spacing.xs,
            borderRadius: theme.radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: active ? theme.colors.hero.panel : theme.colors.errorSubtle,
          }}
        >
          <Text variant="footnote" weight="bold" color={active ? 'textInverse' : 'danger'}>
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function MapModeButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      style={{
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.sm,
        backgroundColor: active ? theme.colors.primary : 'transparent',
      }}
      pressedStyle={{
        backgroundColor: active ? theme.colors.primaryStrong : theme.colors.pressed,
      }}
    >
      <Text variant="bodyStrong" color={active ? 'textInverse' : 'primary'}>
        3D
      </Text>
    </Pressable>
  );
}

function MapLegend({ alertSummary, bottom }: { alertSummary: string; bottom: number }) {
  const theme = useTheme();
  const t = useT();
  return (
    <View
      style={{
        position: 'absolute',
        left: theme.spacing.md,
        right: theme.spacing.md + 48 + theme.spacing.sm,
        bottom,
      }}
    >
      <Card tone="glass" elevation="medium" padding="sm" radius="md">
        <VStack gap="xs">
          <HStack justify="space-between" align="center" gap="sm">
            <Eyebrow>{t('map.legend.title')}</Eyebrow>
            <Text variant="footnote" color="textMuted">
              {t('map.legend.hint')}
            </Text>
          </HStack>
          <HStack gap="sm" wrap>
            <LegendItem color={DIVISION_COLORS.garhwal} label={t('districts.garhwal')} />
            <LegendItem color={DIVISION_COLORS.kumaon} label={t('districts.kumaon')} />
            <LegendItem color={SEVERITY_COLORS.severe} label={alertSummary} />
            <LegendItem color={ROAD_COLORS.NH} label={t('map.legend.highway')} line />
          </HStack>
        </VStack>
      </Card>
    </View>
  );
}

function LegendItem({ color, label, line }: { color: string; label: string; line?: boolean }) {
  return (
    <HStack gap="xs" align="center">
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: line ? 14 : 8,
          height: line ? 3 : 8,
          borderRadius: 99,
          backgroundColor: color,
        }}
      />
      <Text variant="footnote" color="textMuted">
        {label}
      </Text>
    </HStack>
  );
}

function DistrictPreview({
  name,
  division,
  alertSummary,
  hasAlerts,
  bottom,
  onClose,
  onOpen,
}: {
  name: string;
  division: string | null;
  alertSummary: string;
  hasAlerts: boolean;
  bottom: number;
  onClose: () => void;
  onOpen: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  return (
    <View
      style={{
        position: 'absolute',
        left: theme.spacing.md,
        right: theme.spacing.md,
        bottom,
      }}
    >
      <Card tone="glass" elevation="medium" padding="sm">
        <VStack gap="sm">
          <HStack align="center" gap="sm">
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: theme.radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: hasAlerts
                  ? theme.colors.errorSubtle
                  : theme.colors.primarySubtle,
              }}
            >
              <Icon
                name={hasAlerts ? 'warning-outline' : 'business-outline'}
                size={20}
                tone={hasAlerts ? 'danger' : 'primary'}
              />
            </View>
            <VStack grow gap="xxs">
              <Eyebrow color={hasAlerts ? 'danger' : 'primary'}>
                {t('map.selection.eyebrow')}
              </Eyebrow>
              <Text variant="heading">{name}</Text>
              <VStack gap="xxs">
                {division ? (
                  <Text variant="footnote" color="textMuted">
                    {t('districts.division', { division })}
                  </Text>
                ) : null}
                <Text variant="footnote" color={hasAlerts ? 'danger' : 'textMuted'}>
                  {alertSummary}
                </Text>
              </VStack>
            </VStack>
            <Pressable
              onPress={onClose}
              accessibilityLabel={t('map.selection.close')}
              style={{
                width: 48,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: theme.radius.pill,
              }}
            >
              <Icon name="close" size={20} tone="textMuted" />
            </Pressable>
          </HStack>
          <Pressable
            onPress={onOpen}
            accessibilityLabel={t('map.selection.view', { name })}
            style={{
              minHeight: 48,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.sm,
              backgroundColor: theme.colors.actionPrimary,
            }}
            pressedStyle={{ backgroundColor: theme.colors.actionPrimaryPressed }}
          >
            <Text variant="bodyStrong" color="textInverse">
              {t('map.selection.view', { name })}
            </Text>
            <Icon name="arrow-forward" size={18} tone="textInverse" />
          </Pressable>
        </VStack>
      </Card>
    </View>
  );
}

/** A square map control. Sized to the 44pt touch target rather than to its glyph. */
function MapButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
      pressedStyle={{ backgroundColor: theme.colors.surfaceMuted }}
    >
      <Icon name={icon} size={20} tone="text" />
    </Pressable>
  );
}
