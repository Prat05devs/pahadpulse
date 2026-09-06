'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import maplibregl, {
  type ExpressionSpecification,
  type MapGeoJSONFeature,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import {
  ATTRIBUTION,
  BASEMAP_STYLE,
  DEFAULT_VIEW,
  DISTRICT_VIEW,
  DISTRICT_BORDER_CASING,
  DIVISION_COLORS,
  SEVERITY_COLORS,
  ROAD_CASING,
  ROAD_COLORS,
  SEVERITY_LABELS,
  TERRAIN_EXAGGERATION,
  TERRAIN_MAX_ZOOM,
  TERRAIN_TILES,
  TERRAIN_TILE_SIZE,
  UTTARAKHAND_BOUNDS,
  UTTARAKHAND_CENTER,
} from './constants';
import type { AlertCollection, DistrictCollection } from './schemas';

/**
 * The 3D terrain map of Uttarakhand.
 *
 * Deliberately not Google Maps. Everything it renders is keyless and free: OpenFreeMap
 * vector tiles for the basemap, AWS Terrain Tiles for the elevation mesh, our own API for
 * district boundaries (OSM via Overpass) and active alerts (SACHET). The only thing Google
 * would still add is a live congestion layer, which this map does not claim to show.
 *
 * Why 3D matters here rather than being decoration: an alert polygon over Chamoli means
 * something different depending on whether it covers a valley floor or a ridge, and a flat
 * map cannot show that. The terrain is the context the warning needs.
 */

interface TerrainMapProps {
  districts: DistrictCollection | null;
  alerts: AlertCollection | null;
  /**
   * When set, the map opens focused on this district AND highlights only that district —
   * the rest drop back to a faint outline so the page's subject is unambiguous.
   */
  focusSlug?: string;
  /** Whether clicking a district navigates to its dashboard. Off on the district page. */
  navigateOnClick?: boolean;
  /**
   * Draw the district layer at all. The alerts view turns this off: there the subject is the
   * warning, and filled districts underneath it compete with the thing being warned about.
   */
  showDistricts?: boolean;
  /** Frame the map on the active alerts rather than the whole state. */
  fitToAlerts?: boolean;
  /**
   * Pick the National and State Highways out of the basemap and draw them in the network's
   * own colours. Uses the basemap's `ref` tags rather than our own geometry — the highway
   * lines are already in the vector tiles, so re-serving thousands of ways to redraw what
   * the client has would be pure waste.
   */
  highlightRoads?: boolean;
  /**
   * When set, only this highway stays highlighted and the map frames its extent. Everything
   * else in the network drops back so the selected route is unambiguous.
   */
  selectedRoadRef?: string | null;
  /** Extent of `selectedRoadRef`, as [west, south, east, north]. */
  selectedRoadBounds?: [number, number, number, number] | null;
  className?: string;
}

interface SelectedAlert {
  headline: string;
  severity: string;
  type: string;
  authority: string;
  expiresAt: string | null;
  language: string;
}

const DISTRICTS_SOURCE = 'pp-districts';
const ALERTS_SOURCE = 'pp-alerts';
const TERRAIN_SOURCE = 'pp-terrain';

/** The spellings one canonical highway ref may take in the basemap's tags. */
function refVariants(ref: string): string[] {
  const match = /^(NH|SH)(\d+[A-Z]?)$/.exec(ref.toUpperCase());
  if (match === null) return [ref.toUpperCase()];

  const [, network, number] = match as unknown as [string, string, string];
  const padded = number.replace(/^(\d)(?=[A-Z]?$)/, '0$1');

  return [
    `${network}${number}`,
    `${network} ${number}`,
    `${network}-${number}`,
    `${network}${padded}`,
    `${network} ${padded}`,
  ];
}

function formatExpiry(value: string | null): string {
  if (value === null) return 'no stated expiry';
  // The API sends UTC as 'YYYY-MM-DD HH:mm:ss'; display is IST, converted at the edge only.
  const parsed = new Date(`${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(parsed.getTime())) return 'unknown';
  return parsed.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TerrainMap({
  districts,
  alerts,
  focusSlug,
  navigateOnClick = true,
  showDistricts = true,
  fitToAlerts = false,
  highlightRoads = false,
  selectedRoadRef = null,
  selectedRoadBounds = null,
  className,
}: TerrainMapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hoveredRef = useRef<string | number | null>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [terrainOn, setTerrainOn] = useState(true);
  const [alertsOn, setAlertsOn] = useState(true);
  const [selected, setSelected] = useState<SelectedAlert | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  const usesPlaceholder = useMemo(
    () => (districts?.features ?? []).some((feature) => feature.properties.isPlaceholder),
    [districts]
  );

  const activeAlertCount = alerts?.features.length ?? 0;

  const focusDistrict = useCallback(
    (map: maplibregl.Map) => {
      if (focusSlug === undefined) return;
      const target = districts?.features.find(
        (feature) => feature.properties.slug === focusSlug
      );
      const centroid = target?.properties.centroid;
      if (centroid === null || centroid === undefined) return;

      map.jumpTo({
        center: [centroid.lng, centroid.lat],
        zoom: DISTRICT_VIEW.zoom,
        pitch: DISTRICT_VIEW.pitch,
        bearing: DISTRICT_VIEW.bearing,
      });
    },
    [districts, focusSlug]
  );

  useEffect(() => {
    if (containerRef.current === null || mapRef.current !== null) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: BASEMAP_STYLE as unknown as StyleSpecification,
        center: UTTARAKHAND_CENTER,
        zoom: DEFAULT_VIEW.zoom,
        pitch: DEFAULT_VIEW.pitch,
        bearing: DEFAULT_VIEW.bearing,
        // Keeps the map on Uttarakhand. This is a state portal; panning to Kerala is not a
        // feature, and the terrain tiles are only paid attention to over this extent.
        maxBounds: [
          [UTTARAKHAND_BOUNDS[0] - 1.5, UTTARAKHAND_BOUNDS[1] - 1.5],
          [UTTARAKHAND_BOUNDS[2] + 1.5, UTTARAKHAND_BOUNDS[3] + 1.5],
        ],
        maxZoom: 15,
        attributionControl: false,
      });
    } catch {
      // WebGL unavailable — an old device or a locked-down browser. The page must still
      // work: every figure on it is reachable without the map.
      setFailed(true);
      return;
    }

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.on('error', (event) => {
      // A single failed tile must not blank the map, so this never throws. It is not silent
      // either: swallowing map errors outright hides real breakage (a missing glyph, a bad
      // layer spec) behind a map that merely looks incomplete.
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[map]', event.error?.message ?? event);
      }
    });

    map.on('load', () => {
      map.addSource(TERRAIN_SOURCE, {
        type: 'raster-dem',
        tiles: [TERRAIN_TILES],
        tileSize: TERRAIN_TILE_SIZE,
        // The AWS tiles are Mapzen `terrarium`, not Mapbox RGB. Getting this wrong renders
        // a plausible-looking but entirely fictional landscape.
        encoding: 'terrarium',
        maxzoom: TERRAIN_MAX_ZOOM,
        attribution: 'Terrain: Mapzen / AWS Terrain Tiles',
      });

      map.setTerrain({ source: TERRAIN_SOURCE, exaggeration: TERRAIN_EXAGGERATION });

      map.addLayer({
        id: 'pp-hillshade',
        type: 'hillshade',
        source: TERRAIN_SOURCE,
        paint: {
          'hillshade-exaggeration': 0.35,
          'hillshade-shadow-color': '#3d4a52',
          'hillshade-highlight-color': '#ffffff',
        },
      });

      if (highlightRoads) {
        // `transportation_name` is the basemap layer that carries the `ref` tag; the plain
        // `transportation` layer has road class but no number, so it cannot tell NH from SH.
        // Matching on the ref prefix is what makes this an actual highway highlight rather
        // than a "big roads" highlight.
        const isNetwork = (network: 'NH' | 'SH'): ExpressionSpecification => [
          '==',
          ['slice', ['coalesce', ['get', 'ref'], ''], 0, 2],
          network,
        ];

        // A dark casing under both networks. Bright yellow on the near-white plains has
        // almost no edge of its own; this gives it one without dulling the colour.
        map.addLayer({
          id: 'pp-road-casing',
          type: 'line',
          source: 'openmaptiles',
          'source-layer': 'transportation_name',
          filter: [
            'in',
            ['slice', ['upcase', ['coalesce', ['get', 'ref'], '']], 0, 2],
            ['literal', ['NH', 'SH']],
          ],
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ROAD_CASING,
            'line-width': ['interpolate', ['linear'], ['zoom'], 6, 4, 10, 8, 14, 13],
            'line-opacity': 0.55,
          },
        });

        map.addLayer({
          id: 'pp-road-sh',
          type: 'line',
          source: 'openmaptiles',
          'source-layer': 'transportation_name',
          filter: isNetwork('SH'),
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ROAD_COLORS.SH,
            'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2, 10, 4.5, 14, 8],
            'line-opacity': 0.9,
          },
        });

        // National highways last, so they sit above state highways where the two run
        // together — the more significant route should not be buried by the lesser one.
        map.addLayer({
          id: 'pp-road-nh',
          type: 'line',
          source: 'openmaptiles',
          'source-layer': 'transportation_name',
          filter: isNetwork('NH'),
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ROAD_COLORS.NH,
            'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2.5, 10, 5.5, 14, 9],
            'line-opacity': 0.95,
          },
        });
      }

      if (districts !== null && showDistricts) {
        map.addSource(DISTRICTS_SOURCE, { type: 'geojson', data: districts, promoteId: 'slug' });

        // With a focus district the other twelve drop back to a faint outline, so the page's
        // subject is unambiguous. Without one, every district is equally live because the
        // whole state is the subject.
        const focused: ExpressionSpecification = ['==', ['get', 'slug'], focusSlug ?? ''];

        map.addLayer({
          id: 'pp-district-fill',
          type: 'fill',
          source: DISTRICTS_SOURCE,
          paint: {
            'fill-color': [
              'match',
              ['get', 'division'],
              'garhwal',
              DIVISION_COLORS.garhwal,
              'kumaon',
              DIVISION_COLORS.kumaon,
              '#6b7a83',
            ],
            // Raised from 0.18 on review feedback: at that weight the state read as barely
            // tinted and did not stand out from the plains or Nepal. 0.34 makes Uttarakhand
            // the clear subject while still letting the hillshade through — going much past
            // this flattens the terrain into a colour block.
            'fill-opacity':
              focusSlug === undefined
                ? ['case', ['boolean', ['feature-state', 'hover'], false], 0.52, 0.34]
                : ['case', focused, 0.52, 0.08],
          },
        });

        // Casing first, so the white border draws on top of it. Two layers rather than one
        // darker line: a single dark border would separate the districts but lose the crisp
        // internal division that the white line gives against the fill.
        map.addLayer({
          id: 'pp-district-casing',
          type: 'line',
          source: DISTRICTS_SOURCE,
          paint: {
            'line-color': DISTRICT_BORDER_CASING,
            'line-width':
              focusSlug === undefined
                ? ['case', ['boolean', ['feature-state', 'hover'], false], 4.6, 2.8]
                : ['case', focused, 5.2, 1.4],
            'line-opacity': focusSlug === undefined ? 0.75 : ['case', focused, 0.85, 0.25],
          },
        });

        map.addLayer({
          id: 'pp-district-line',
          type: 'line',
          source: DISTRICTS_SOURCE,
          paint: {
            'line-color': '#ffffff',
            'line-width':
              focusSlug === undefined
                ? ['case', ['boolean', ['feature-state', 'hover'], false], 2.4, 1.3]
                : ['case', focused, 3, 0.6],
            'line-opacity': focusSlug === undefined ? 0.95 : ['case', focused, 1, 0.3],
          },
        });
      }

      if (alerts !== null) {
        map.addSource(ALERTS_SOURCE, { type: 'geojson', data: alerts });

        map.addLayer({
          id: 'pp-alert-fill',
          type: 'fill',
          source: ALERTS_SOURCE,
          filter: ['!=', ['geometry-type'], 'Point'],
          paint: {
            'fill-color': [
              'match',
              ['get', 'severity'],
              'extreme',
              SEVERITY_COLORS.extreme,
              'severe',
              SEVERITY_COLORS.severe,
              'moderate',
              SEVERITY_COLORS.moderate,
              'minor',
              SEVERITY_COLORS.minor,
              SEVERITY_COLORS.unknown,
            ],
            'fill-opacity': 0.42,
          },
        });

        // A white casing under the coloured edge. Terrain is a busy, mid-tone ground and a
        // single thin stroke vanishes into it; the casing is what makes the alert boundary
        // legible over snow, rock and forest alike, which is the same reason road maps
        // case their routes.
        map.addLayer({
          id: 'pp-alert-casing',
          type: 'line',
          source: ALERTS_SOURCE,
          filter: ['!=', ['geometry-type'], 'Point'],
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 5.5, 'line-opacity': 0.9 },
        });

        map.addLayer({
          id: 'pp-alert-outline',
          type: 'line',
          source: ALERTS_SOURCE,
          filter: ['!=', ['geometry-type'], 'Point'],
          paint: {
            'line-color': [
              'match',
              ['get', 'severity'],
              'extreme',
              SEVERITY_COLORS.extreme,
              'severe',
              SEVERITY_COLORS.severe,
              'moderate',
              SEVERITY_COLORS.moderate,
              'minor',
              SEVERITY_COLORS.minor,
              SEVERITY_COLORS.unknown,
            ],
            'line-width': 2.6,
          },
        });

        // Alerts whose source gave only a centroid. Drawn differently on purpose: "somewhere
        // around here" must not look like a surveyed extent.
        map.addLayer({
          id: 'pp-alert-point',
          type: 'circle',
          source: ALERTS_SOURCE,
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            'circle-radius': 7,
            'circle-color': [
              'match',
              ['get', 'severity'],
              'extreme',
              SEVERITY_COLORS.extreme,
              'severe',
              SEVERITY_COLORS.severe,
              'moderate',
              SEVERITY_COLORS.moderate,
              SEVERITY_COLORS.unknown,
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
            'circle-opacity': 0.9,
          },
        });
      }

      focusDistrict(map);
      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Built once. Data updates are pushed through setData below rather than by rebuilding
    // the map, which would drop the user's camera position on every refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** District hover and click. Registered separately so it can depend on the router. */
  useEffect(() => {
    const map = mapRef.current;
    if (map === null || !ready) return;

    const onMove = (event: maplibregl.MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
      const feature = event.features?.[0];
      if (feature === undefined) return;

      if (hoveredRef.current !== null) {
        map.setFeatureState({ source: DISTRICTS_SOURCE, id: hoveredRef.current }, { hover: false });
      }
      hoveredRef.current = feature.id ?? null;
      if (hoveredRef.current !== null) {
        map.setFeatureState({ source: DISTRICTS_SOURCE, id: hoveredRef.current }, { hover: true });
      }
      setHoveredDistrict(String(feature.properties?.nameEn ?? ''));
      map.getCanvas().style.cursor = navigateOnClick ? 'pointer' : '';
    };

    const onLeave = () => {
      if (hoveredRef.current !== null) {
        map.setFeatureState({ source: DISTRICTS_SOURCE, id: hoveredRef.current }, { hover: false });
      }
      hoveredRef.current = null;
      setHoveredDistrict(null);
      map.getCanvas().style.cursor = '';
    };

    const onDistrictClick = (
      event: maplibregl.MapMouseEvent & { features?: MapGeoJSONFeature[] }
    ) => {
      if (!navigateOnClick) return;
      const slug = event.features?.[0]?.properties?.slug;
      if (typeof slug === 'string') router.push(`/districts/${slug}`);
    };

    const onAlertClick = (
      event: maplibregl.MapMouseEvent & { features?: MapGeoJSONFeature[] }
    ) => {
      const properties = event.features?.[0]?.properties;
      if (properties === undefined) return;
      setSelected({
        headline: String(properties.headline ?? ''),
        severity: String(properties.severity ?? 'unknown'),
        type: String(properties.type ?? ''),
        authority: String(properties.authority ?? ''),
        expiresAt: properties.expiresAt === null ? null : String(properties.expiresAt),
        language: String(properties.language ?? 'en'),
      });
    };

    map.on('mousemove', 'pp-district-fill', onMove);
    map.on('mouseleave', 'pp-district-fill', onLeave);
    map.on('click', 'pp-district-fill', onDistrictClick);
    map.on('click', 'pp-alert-fill', onAlertClick);
    map.on('click', 'pp-alert-point', onAlertClick);

    return () => {
      map.off('mousemove', 'pp-district-fill', onMove);
      map.off('mouseleave', 'pp-district-fill', onLeave);
      map.off('click', 'pp-district-fill', onDistrictClick);
      map.off('click', 'pp-alert-fill', onAlertClick);
      map.off('click', 'pp-alert-point', onAlertClick);
    };
  }, [ready, navigateOnClick, router]);

  /**
   * District names, as DOM markers rather than a symbol layer.
   *
   * A MapLibre symbol layer is placed at elevation 0, so with 3D terrain enabled every label
   * ended up buried inside the mountain mesh and none of them drew. Markers are DOM elements
   * positioned over the canvas: they cannot be occluded by terrain, they never lose a
   * collision fight with the basemap's own labels, and with only 13 of them the cost is
   * nil. They also inherit the site's typography instead of a bitmap glyph stack.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (map === null || !ready || districts === null || !showDistricts) return;

    const markers = districts.features
      .filter((feature) => feature.properties.centroid !== null)
      .map((feature) => {
        const element = document.createElement('span');
        element.textContent = feature.properties.nameEn;
        element.className =
          'pointer-events-none select-none whitespace-nowrap text-[11px] font-semibold tracking-wide text-[#10222b] [text-shadow:0_0_3px_#fff,0_0_3px_#fff,0_0_5px_#fff]';

        return new maplibregl.Marker({ element, anchor: 'center' })
          .setLngLat([
            feature.properties.centroid?.lng ?? 0,
            feature.properties.centroid?.lat ?? 0,
          ])
          .addTo(map);
      });

    return () => {
      for (const marker of markers) marker.remove();
    };
  }, [districts, ready, showDistricts]);

  /**
   * Highway selection: dim the network to the chosen route and fly to it.
   *
   * Filtering by exact `ref` rather than prefix, so picking SH12 does not also light SH120.
   * The basemap spells refs the same handful of ways OSM does, so the comparison strips
   * spaces and hyphens the way the backend's normaliser does.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (map === null || !ready || !highlightRoads) return;

    const normalise: ExpressionSpecification = [
      'upcase',
      ['coalesce', ['get', 'ref'], ''],
    ];

    // The casing follows whatever the two coloured layers show, so a selected route keeps
    // its outline and the rest of the network loses both line and casing together.
    if (map.getLayer('pp-road-casing') !== undefined) {
      const networks: ExpressionSpecification = [
        'in',
        ['slice', ['upcase', ['coalesce', ['get', 'ref'], '']], 0, 2],
        ['literal', ['NH', 'SH']],
      ];
      map.setFilter(
        'pp-road-casing',
        selectedRoadRef === null
          ? networks
          : ['all', networks, ['in', ['upcase', ['coalesce', ['get', 'ref'], '']], ['literal', refVariants(selectedRoadRef)]]]
      );
    }

    for (const [layer, network] of [
      ['pp-road-nh', 'NH'],
      ['pp-road-sh', 'SH'],
    ] as const) {
      if (map.getLayer(layer) === undefined) continue;

      const belongsToNetwork: ExpressionSpecification = [
        '==',
        ['slice', normalise, 0, 2],
        network,
      ];

      if (selectedRoadRef === null) {
        map.setFilter(layer, belongsToNetwork);
        map.setPaintProperty(layer, 'line-opacity', network === 'NH' ? 0.95 : 0.9);
        continue;
      }

      // The basemap spells refs the way OSM's contributors did, so one highway appears as
      // "NH34", "NH 34" or "NH-34". Matching an explicit variant list is exact — a prefix
      // test would light SH120 when SH12 was picked.
      const variants = refVariants(selectedRoadRef);
      map.setFilter(layer, [
        'all',
        belongsToNetwork,
        ['in', normalise, ['literal', variants]],
      ]);
      map.setPaintProperty(layer, 'line-opacity', 1);
    }

    if (selectedRoadBounds !== null) {
      map.fitBounds(
        [
          [selectedRoadBounds[0], selectedRoadBounds[1]],
          [selectedRoadBounds[2], selectedRoadBounds[3]],
        ],
        // maxZoom 15, and tight padding. The basemap only carries a road's `ref` from a
        // certain zoom upward, and for state highways that threshold is high — decoding the
        // vector tiles over SH12 showed NH refs from z8 but no SH ref until much closer. A
        // short route therefore has to be framed hard before it renders at all; a long one
        // is still limited by its own extent, so this cap only bites on the short ones.
        { padding: 40, maxZoom: 15, pitch: 45, duration: 1100 }
      );
    }
  }, [ready, highlightRoads, selectedRoadRef, selectedRoadBounds]);

  /** Frame the map on the active warnings, for the view whose subject is the warnings. */
  useEffect(() => {
    const map = mapRef.current;
    if (map === null || !ready || !fitToAlerts || alerts === null) return;
    if (alerts.features.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    for (const feature of alerts.features) {
      const { geometry } = feature;
      if (geometry.type === 'Point') {
        bounds.extend(geometry.coordinates as [number, number]);
      } else if (geometry.type === 'Polygon') {
        for (const ring of geometry.coordinates) for (const p of ring) bounds.extend(p);
      } else {
        for (const poly of geometry.coordinates)
          for (const ring of poly) for (const p of ring) bounds.extend(p);
      }
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 80, maxZoom: 9.5, pitch: 45, duration: 1200 });
    }
  }, [ready, fitToAlerts, alerts]);

  /** Push fresh alert data without rebuilding the map or moving the camera. */
  useEffect(() => {
    const map = mapRef.current;
    if (map === null || !ready || alerts === null) return;

    const source = map.getSource(ALERTS_SOURCE);
    if (source !== undefined && 'setData' in source) {
      (source as maplibregl.GeoJSONSource).setData(alerts);
    }
  }, [alerts, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (map === null || !ready) return;

    map.setTerrain(
      terrainOn ? { source: TERRAIN_SOURCE, exaggeration: TERRAIN_EXAGGERATION } : null
    );
    if (map.getLayer('pp-hillshade') !== undefined) {
      map.setLayoutProperty('pp-hillshade', 'visibility', terrainOn ? 'visible' : 'none');
    }
    if (!terrainOn) map.easeTo({ pitch: 0, duration: 400 });
    else map.easeTo({ pitch: DEFAULT_VIEW.pitch, duration: 400 });
  }, [terrainOn, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (map === null || !ready) return;

    for (const layer of ['pp-alert-fill', 'pp-alert-casing', 'pp-alert-outline', 'pp-alert-point']) {
      if (map.getLayer(layer) !== undefined) {
        map.setLayoutProperty(layer, 'visibility', alertsOn ? 'visible' : 'none');
      }
    }
    if (!alertsOn) setSelected(null);
  }, [alertsOn, ready]);

  if (failed) {
    return (
      <div
        className={`flex min-h-[420px] items-center justify-center rounded-lg border border-border bg-surface p-8 text-center ${className ?? ''}`}
      >
        <div>
          <p className="font-semibold text-text-light">The map could not be displayed</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This browser does not support WebGL. Every district and alert is still available
            from the pages below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-border ${className ?? 'h-[520px] md:h-[620px]'}`}
    >
      <div ref={containerRef} className="h-full w-full" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/80">
          <p className="text-sm text-muted-foreground">Loading terrain…</p>
        </div>
      )}

      {/* Controls. Kept to the two toggles that change what the map means, rather than a
          full layer panel for layers that have no data behind them yet. */}
      <div className="absolute left-3 top-3 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => {
            setTerrainOn((on) => !on);
          }}
          aria-pressed={terrainOn}
          className="rounded-md border border-border bg-surface/95 px-3 py-1.5 text-xs font-medium shadow-card backdrop-blur transition hover:bg-surface-hover"
        >
          {terrainOn ? '3D terrain on' : '3D terrain off'}
        </button>
        <button
          type="button"
          onClick={() => {
            setAlertsOn((on) => !on);
          }}
          aria-pressed={alertsOn}
          className="rounded-md border border-border bg-surface/95 px-3 py-1.5 text-xs font-medium shadow-card backdrop-blur transition hover:bg-surface-hover"
        >
          Alerts {alertsOn ? 'on' : 'off'} ({activeAlertCount})
        </button>
      </div>

      {hoveredDistrict !== null && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-md border border-border bg-surface/95 px-3 py-1.5 text-xs font-semibold shadow-card backdrop-blur">
          {hoveredDistrict}
        </div>
      )}

      {/* Severity legend, using the source's own scale. */}
      {alertsOn && activeAlertCount > 0 && (
        <div className="absolute bottom-10 left-3 rounded-md border border-border bg-surface/95 px-3 py-2 shadow-card backdrop-blur">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Alert severity
          </p>
          <div className="flex flex-col gap-1">
            {['extreme', 'severe', 'moderate', 'minor'].map((severity) => (
              <div key={severity} className="flex items-center gap-2 text-[11px]">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: SEVERITY_COLORS[severity] }}
                />
                {SEVERITY_LABELS[severity]}
              </div>
            ))}
          </div>
        </div>
      )}

      {selected !== null && (
        <div className="absolute bottom-3 right-3 max-w-sm rounded-lg border border-border bg-surface/97 p-4 shadow-card-hover backdrop-blur">
          <div className="mb-2 flex items-start justify-between gap-3">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
              style={{ backgroundColor: SEVERITY_COLORS[selected.severity] ?? SEVERITY_COLORS.unknown }}
            >
              {SEVERITY_LABELS[selected.severity] ?? selected.severity}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
              }}
              aria-label="Close alert details"
              className="text-muted-foreground transition hover:text-text-light"
            >
              ✕
            </button>
          </div>

          {/* Alert text is shown in the language the authority issued it in and is never
              machine translated — a mistranslated flood warning is a safety failure. */}
          <p className="text-sm leading-snug text-text-light" lang={selected.language}>
            {selected.headline}
          </p>

          <dl className="mt-3 space-y-0.5 text-[11px] text-muted-foreground">
            <div className="flex justify-between gap-4">
              <dt>Issued by</dt>
              <dd className="text-right font-medium">{selected.authority}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Valid until</dt>
              <dd className="text-right font-medium">{formatExpiry(selected.expiresAt)} IST</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="absolute bottom-0 right-0 rounded-tl bg-surface/90 px-2 py-0.5 text-[10px] text-muted-foreground">
        {ATTRIBUTION}
      </div>

      {usesPlaceholder && (
        <div className="absolute bottom-10 right-3 rounded border border-warning bg-warning-soft px-2 py-1 text-[10px] text-text-light">
          Some boundaries are placeholder geometry
        </div>
      )}
    </div>
  );
}
