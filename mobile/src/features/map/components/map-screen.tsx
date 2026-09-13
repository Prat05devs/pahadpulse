import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { HStack, Icon, Pressable, Text, type IconName } from '@/components/atoms';
import { ErrorState, LoadingState } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useTheme } from '@/theme';

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
const LAYER_LABELS: Record<MapLayerKey, string> = {
  districts: 'Districts',
  alerts: 'Alerts',
  highways: 'Highways',
};

/**
 * The 3D terrain map of Uttarakhand.
 *
 * It is a WebKit window filling the screen. MapLibre GL JS renders the map natively using
 * WebGL, so it pans at 60fps on both platforms. The alternative — bridging a native mapping
 * SDK into React Native — is slower to build and rarely achieves this framerate without
 * crashing.
 */
export function MapScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [layers, setLayers] = useState<MapLayerState>(DEFAULT_LAYERS);
  const [terrain, setTerrain] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const webRef = useRef<WebView>(null);

  const districts = useDistrictFeatures();
  const alerts = useAlertFeatures();

  /*
   * Rebuilt only when the data changes. The document embeds ~100 KB of GeoJSON, and
   * rebuilding it on every render would reload the WebView — losing the reader's pan and
   * zoom every time anything else on the screen changed.
   */
  const html = useMemo(
    () =>
      buildMapHtml({
        districts: districts.data ?? null,
        alerts: alerts.data ?? null,
      }),
    [districts.data, alerts.data],
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
        `window.ppSetLayers && window.ppSetLayers(${JSON.stringify(next)}); true;`,
      );
      return next;
    });
  }, []);

  const zoomBy = useCallback((delta: number) => {
    webRef.current?.injectJavaScript(
      `window.ppZoom && window.ppZoom(${String(delta)}); true;`,
    );
  }, []);

  /** Back to the whole state. The way out of being lost at high zoom. */
  const resetFrame = useCallback(() => {
    webRef.current?.injectJavaScript('window.ppFrame && window.ppFrame(); true;');
  }, []);

  const toggleTerrain = useCallback(() => {
    setTerrain((on) => {
      const next = !on;
      webRef.current?.injectJavaScript(
        `window.ppSetTerrain && window.ppSetTerrain(${String(next)}); true;`,
      );
      return next;
    });
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
      router.push(`/districts/${message.slug}`);
    },
    [router],
  );

  if (districts.isPending) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading the map" />
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
   * A failure inside the document — the library or the basemap style not loading — is a
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
        accessibilityLabel={`Interactive map of Uttarakhand with ${districts.data?.features.length ?? 0} districts. Use the Districts tab for an accessible list of every district.`}
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
          <LoadingState label="Drawing the terrain" />
        </View>
      ) : null}

      {/*
        * Layer toggles, as a scrolling row over the map.
        *
        * Over the map rather than in a sheet: turning a layer on is the main thing a reader
        * does here, and the point of toggling is watching the map change — a sheet that
        * covers the map hides the very thing the control is acting on.
        */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ position: 'absolute', top: insets.top + theme.spacing.sm, left: 0, right: 0 }}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          gap: theme.spacing.xs,
        }}
      >
        {MAP_LAYERS.map((key) => (
          <LayerChip
            key={key}
            label={LAYER_LABELS[key]}
            active={layers[key]}
            onPress={() => toggleLayer(key)}
          />
        ))}
        <LayerChip label="3D" active={terrain} onPress={toggleTerrain} icon="triangle-outline" />
      </ScrollView>

      {/*
        * Zoom and reset, stacked above the credits control.
        *
        * Pinch works, but it is not the only way anyone holds a phone — one-handed, gloved,
        * or with limited dexterity, a pinch is awkward or impossible, and on a simulator it
        * is worse. Buttons are the accessible path, not a fallback.
        */}
      <View
        style={{
          position: 'absolute',
          right: theme.spacing.md,
          bottom: insets.bottom + theme.spacing.sm + 44 + theme.spacing.xs,
          borderRadius: theme.radius.md,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        <MapButton label="Zoom in" icon="add" onPress={() => zoomBy(1)} />
        <View style={{ height: 1, backgroundColor: theme.colors.border }} />
        <MapButton label="Zoom out" icon="remove" onPress={() => zoomBy(-1)} />
        <View style={{ height: 1, backgroundColor: theme.colors.border }} />
        <MapButton label="Fit the whole state" icon="scan-outline" onPress={resetFrame} />
      </View>

      {/*
        * Attribution lives behind this control rather than printed across the map.
        *
        * OpenStreetMap's licence requires the credit to be reachable, not that it sit on the
        * map itself — the standard treatment on a phone, where a permanent two-line caption
        * covers the terrain it is crediting.
        */}
      <Pressable
        onPress={() => setCreditsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Map sources and credits"
        style={{
          position: 'absolute',
          right: theme.spacing.md,
          bottom: insets.bottom + theme.spacing.sm,
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <Icon name="information-outline" size={18} tone="textMuted" />
      </Pressable>

      <Modal
        visible={creditsOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setCreditsOpen(false)}
      >
        <View
          style={{ flex: 1, justifyContent: 'flex-end' }}
          accessibilityViewIsModal
        >
          <Pressable
            onPress={() => setCreditsOpen(false)}
            accessibilityLabel="Close map sources"
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
              <Text variant="title">Map sources</Text>
              <Pressable onPress={() => setCreditsOpen(false)} accessibilityLabel="Close map sources">
                <Icon name="close" size={24} tone="text" />
              </Pressable>
            </HStack>
            <Text variant="body" color="textMuted">
              {MAP_ATTRIBUTION}
            </Text>
            <Text variant="caption" color="textMuted">
              District boundaries and highway numbers come from OpenStreetMap. Elevation is
              from the AWS Terrain Tiles public dataset. Nothing on this map requires an API
              key.
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
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: 'triangle-outline';
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
      {icon !== undefined ? (
        <Icon name={icon} size={13} tone={active ? 'textInverse' : 'textMuted'} />
      ) : null}
      <Text variant="caption" color={active ? 'textInverse' : 'text'}>
        {label}
      </Text>
    </Pressable>
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
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      pressedStyle={{ backgroundColor: theme.colors.surfaceMuted }}
    >
      <Icon name={icon} size={20} tone="text" />
    </Pressable>
  );
}
