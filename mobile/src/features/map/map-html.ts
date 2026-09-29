import {
  ALERT_FILL_OPACITY,
  ATTRIBUTION,
  BASEMAP_STYLE,
  DEFAULT_VIEW,
  DISTRICT_BORDER_CASING,
  DISTRICT_FILL_OPACITY,
  DIVISION_COLORS,
  FIRE_COLORS,
  HILLSHADE,
  ROAD_CASING,
  ROAD_COLORS,
  TERRAIN_VIEW,
  MAPLIBRE_CSS,
  MAPLIBRE_JS,
  SEVERITY_COLORS,
  TERRAIN_EXAGGERATION,
  TERRAIN_MAX_ZOOM,
  TERRAIN_TILE_SIZE,
  TERRAIN_TILES,
  UTTARAKHAND_BOUNDS,
  UTTARAKHAND_CENTER,
} from './constants';
import type { AlertCollection, DistrictCollection, FireCollection } from './schemas';

/**
 * Serialise a value for embedding inside a `<script>` tag.
 *
 * `JSON.stringify` alone is not safe here: a `</script>` sequence anywhere in the data ends
 * the script element early, and U+2028/U+2029 are literal line terminators in JavaScript
 * (though not in JSON), which is a syntax error rather than a string. Neither can appear in
 * our own geometry, but this data is a network payload and the escaping costs nothing.
 */
function toScriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export interface BuildMapHtmlOptions {
  districts: DistrictCollection | null;
  alerts: AlertCollection | null;
  fires?: FireCollection | null;
  language?: 'en' | 'hi';
  palette?: MapDocumentPalette;
}

export type MapDocumentPalette = {
  background: string;
  text: string;
  labelBackground: string;
  labelBorder: string;
  labelShadow: string;
  selection: string;
  selectionCasing: string;
};

const DEFAULT_DOCUMENT_PALETTE: MapDocumentPalette = {
  background: '#FAF8FF',
  text: '#131B2E',
  labelBackground: 'rgba(255, 255, 255, 0.92)',
  labelBorder: 'rgba(19, 27, 46, 0.22)',
  labelShadow: 'rgba(19, 27, 46, 0.2)',
  selection: '#015BD6',
  selectionCasing: '#FFFFFF',
};

/**
 * The layers a reader can turn on and off, and whether each starts visible.
 *
 * `districts` and `alerts` are the two the API's own layer registry reports as available;
 * highways are drawn from the basemap, so they are offered here without waiting on a new endpoint.
 * Fires are NASA FIRMS satellite detections, on by default: in fire season they are the
 * reason many readers open the map at all.
 */
export const MAP_LAYERS = ['districts', 'alerts', 'fires', 'highways'] as const;
export type MapLayerKey = (typeof MAP_LAYERS)[number];
export type MapLayerState = Record<MapLayerKey, boolean>;

export const DEFAULT_LAYERS: MapLayerState = {
  districts: true,
  alerts: true,
  fires: true,
  highways: false,
};

/**
 * The whole map, as one self-contained HTML document.
 *
 * Why a WebView at all: MapLibre's 3D terrain has no React Native equivalent that runs in
 * Expo Go, and the terrain is the reason this map exists - an alert polygon over Chamoli
 * means something different depending on whether it covers a valley floor or a ridge, and a
 * flat map cannot show that. Rendering the same library the web app uses also means the two
 * maps cannot drift apart in how they read.
 *
 * The GeoJSON is inlined into the document rather than fetched from inside it, so the app's
 * own validated, cached data is what gets drawn - the WebView never talks to our API, and
 * there is exactly one place (the Zod schemas) where a payload is trusted.
 */
export function buildMapHtml({
  districts,
  alerts,
  fires = null,
  language = 'en',
  palette = DEFAULT_DOCUMENT_PALETTE,
}: BuildMapHtmlOptions): string {
  const districtJson = toScriptJson(districts ?? { type: 'FeatureCollection', features: [] });
  const alertJson = toScriptJson(alerts ?? { type: 'FeatureCollection', features: [] });
  const fireJson = toScriptJson(fires ?? { type: 'FeatureCollection', features: [] });

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link href="${MAPLIBRE_CSS}" rel="stylesheet" />
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: ${palette.background}; }
  /* The RN screen draws its own attribution, where it can be styled with the app's type. */
  .maplibregl-ctrl-attrib, .maplibregl-ctrl-bottom-right { display: none; }
  .pp-district-label {
    pointer-events: none;
    white-space: nowrap;
    padding: 3px 7px;
    border: 1px solid ${palette.labelBorder};
    border-radius: 999px;
    background: ${palette.labelBackground};
    box-shadow: 0 1px 4px ${palette.labelShadow};
    color: ${palette.text};
    font: 600 11px/15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    letter-spacing: 0.1px;
  }
  #err {
    position: absolute; inset: 0; display: none; padding: 24px;
    font: 15px -apple-system, system-ui, sans-serif; color: ${palette.text}; background: ${palette.background};
  }
</style>
</head>
<body>
<div id="map"></div>
<div id="err"></div>
<script src="${MAPLIBRE_JS}"></script>
<script>
(function () {
  var post = function (msg) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  };

  var fail = function (message) {
    var el = document.getElementById('err');
    el.style.display = 'block';
    el.textContent = message;
    post({ type: 'error', message: message });
  };

  window.onerror = function (message) { fail(String(message)); };

  if (typeof maplibregl === 'undefined') {
    fail('The map library could not be loaded. Check your connection and try again.');
    return;
  }

  var districts = ${districtJson};
  var alerts = ${alertJson};
  var fires = ${fireJson};
  var terrainOn = false;

  var map = new maplibregl.Map({
    container: 'map',
    style: ${toScriptJson(BASEMAP_STYLE)},
    center: ${toScriptJson(UTTARAKHAND_CENTER)},
    zoom: ${DEFAULT_VIEW.zoom},
    /*
     * Flat and north-up on load, matching the web map's considered default: a pitched map
     * makes the northern districts recede and read as smaller than they are. Relief comes
     * from the hillshade layer instead, and the tilt is the reader's choice.
     */
    pitch: 0,
    bearing: 0,
    maxBounds: [[76.4, 27.6], [82.2, 32.6]],
    attributionControl: false
  });

  map.on('error', function (e) {
    // A single failed tile is not worth an error screen; a failed style is.
    if (e && e.error && e.error.status === 404) return;
  });

  map.on('load', function () {
    map.addSource('terrain', {
      type: 'raster-dem',
      tiles: [${toScriptJson(TERRAIN_TILES)}],
      encoding: 'terrarium',
      tileSize: ${TERRAIN_TILE_SIZE},
      maxzoom: ${TERRAIN_MAX_ZOOM}
    });
    map.addLayer({
      id: 'hillshade',
      type: 'hillshade',
      source: 'terrain',
      paint: {
        'hillshade-exaggeration': ${HILLSHADE.exaggeration},
        'hillshade-shadow-color': ${toScriptJson(HILLSHADE.shadow)},
        'hillshade-highlight-color': ${toScriptJson(HILLSHADE.highlight)}
      }
    });

    map.addSource('districts', { type: 'geojson', data: districts });
    map.addSource('alerts', { type: 'geojson', data: alerts });
    map.addSource('fires', { type: 'geojson', data: fires });

    /*
     * Highways, drawn by restyling the BASEMAP's own vector roads rather than from our API.
     *
     * road_routes in our database stores a ref, a segment count and a bounding box - no
     * geometry - so there is nothing of ours to draw. The basemap already carries every
     * road; transportation_name is the layer that carries the ref tag, and matching on
     * its prefix is what makes this an actual NH/SH highlight rather than a "big roads" one.
     */
    var isNetwork = function (network) {
      return ['==', ['slice', ['upcase', ['coalesce', ['get', 'ref'], '']], 0, 2], network];
    };

    map.addLayer({
      id: 'road-casing',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      filter: ['in', ['slice', ['upcase', ['coalesce', ['get', 'ref'], '']], 0, 2], ['literal', ['NH', 'SH']]],
      layout: { 'line-join': 'round', 'line-cap': 'round', visibility: 'none' },
      paint: {
        'line-color': ${toScriptJson(ROAD_CASING)},
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 4, 10, 8, 14, 13],
        'line-opacity': 0.55
      }
    });

    map.addLayer({
      id: 'road-sh',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      filter: isNetwork('SH'),
      layout: { 'line-join': 'round', 'line-cap': 'round', visibility: 'none' },
      paint: {
        'line-color': ${toScriptJson(ROAD_COLORS.SH)},
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2, 10, 4.5, 14, 8],
        'line-opacity': 0.9
      }
    });

    // National highways last, so they sit above state highways where the two run together.
    map.addLayer({
      id: 'road-nh',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      filter: isNetwork('NH'),
      layout: { 'line-join': 'round', 'line-cap': 'round', visibility: 'none' },
      paint: {
        'line-color': ${toScriptJson(ROAD_COLORS.NH)},
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2.5, 10, 5.5, 14, 9],
        'line-opacity': 0.95
      }
    });


    map.addLayer({
      id: 'district-fill',
      type: 'fill',
      source: 'districts',
      paint: {
        'fill-color': [
          'match', ['get', 'division'],
          'garhwal', ${toScriptJson(DIVISION_COLORS.garhwal)},
          'kumaon', ${toScriptJson(DIVISION_COLORS.kumaon)},
          '#3A4A63'
        ],
        'fill-opacity': ${DISTRICT_FILL_OPACITY}
      }
    });

    map.addLayer({
      id: 'district-casing',
      type: 'line',
      source: 'districts',
      paint: { 'line-color': ${toScriptJson(DISTRICT_BORDER_CASING)}, 'line-width': 3 }
    });

    map.addLayer({
      id: 'district-border',
      type: 'line',
      source: 'districts',
      paint: { 'line-color': '#FFFFFF', 'line-width': 1.1 }
    });

    map.addLayer({
      id: 'district-selected-casing',
      type: 'line',
      source: 'districts',
      filter: ['==', ['get', 'slug'], ''],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': ${toScriptJson(palette.selectionCasing)}, 'line-width': 7 }
    });

    map.addLayer({
      id: 'district-selected',
      type: 'line',
      source: 'districts',
      filter: ['==', ['get', 'slug'], ''],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': ${toScriptJson(palette.selection)}, 'line-width': 4 }
    });

    var alertColor = [
      'match', ['get', 'severity'],
      'extreme', ${toScriptJson(SEVERITY_COLORS.extreme)},
      'severe', ${toScriptJson(SEVERITY_COLORS.severe)},
      'moderate', ${toScriptJson(SEVERITY_COLORS.moderate)},
      'minor', ${toScriptJson(SEVERITY_COLORS.minor)},
      ${toScriptJson(SEVERITY_COLORS.unknown)}
    ];

    map.addLayer({
      id: 'alert-fill',
      type: 'fill',
      source: 'alerts',
      filter: ['!=', ['geometry-type'], 'Point'],
      paint: {
        'fill-color': alertColor,
        'fill-opacity': [
          'match', ['coalesce', ['get', 'extent'], 'district'],
          'published', ${ALERT_FILL_OPACITY.published},
          'district', ${ALERT_FILL_OPACITY.district},
          ${ALERT_FILL_OPACITY.fallback}
        ]
      }
    });

    map.addLayer({
      id: 'alert-casing',
      type: 'line',
      source: 'alerts',
      filter: ['!=', ['geometry-type'], 'Point'],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#FFFFFF', 'line-width': 4.5, 'line-opacity': 0.9 }
    });

    map.addLayer({
      id: 'alert-outline',
      type: 'line',
      source: 'alerts',
      filter: ['!=', ['geometry-type'], 'Point'],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': alertColor, 'line-width': 2.4, 'line-opacity': 0.96 }
    });

    map.addLayer({
      id: 'alert-point',
      type: 'circle',
      source: 'alerts',
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': 7,
        'circle-color': [
          'match', ['get', 'severity'],
          'extreme', ${toScriptJson(SEVERITY_COLORS.extreme)},
          'severe', ${toScriptJson(SEVERITY_COLORS.severe)},
          'moderate', ${toScriptJson(SEVERITY_COLORS.moderate)},
          'minor', ${toScriptJson(SEVERITY_COLORS.minor)},
          ${toScriptJson(SEVERITY_COLORS.unknown)}
        ],
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 1.5
      }
    });

    /*
     * Fire detections, above the alerts so a hotspot inside a warning area stays tappable.
     *
     * Size follows fire radiative power, the satellite's measure of how much heat the fire
     * gives off, so a large fire reads larger than a smouldering one. The halo is what
     * keeps a small point visible over hillshade and a district tint.
     */
    var fireColor = [
      'match', ['get', 'confidence'],
      'high', ${toScriptJson(FIRE_COLORS.high)},
      'nominal', ${toScriptJson(FIRE_COLORS.nominal)},
      ${toScriptJson(FIRE_COLORS.low)}
    ];
    var fireRadius = [
      'interpolate', ['linear'], ['coalesce', ['get', 'frpMw'], 0],
      0, 4.5,
      20, 6.5,
      100, 9
    ];

    map.addLayer({
      id: 'fire-halo',
      type: 'circle',
      source: 'fires',
      paint: {
        'circle-radius': ['+', fireRadius, 6],
        'circle-color': fireColor,
        'circle-opacity': ['match', ['get', 'confidence'], 'low', 0.12, 0.28],
        'circle-blur': 0.8
      }
    });

    map.addLayer({
      id: 'fire-point',
      type: 'circle',
      source: 'fires',
      paint: {
        'circle-radius': fireRadius,
        'circle-color': fireColor,
        'circle-opacity': ['match', ['get', 'confidence'], 'low', 0.7, 1],
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 1.2
      }
    });

    /*
     * District names are DOM markers so terrain and data fills can never bury them. With
     * only thirteen labels this has negligible cost and is more reliable than a symbol
     * layer, whose collision system can discard the names on a narrow phone viewport.
     */
    var LABEL_OFFSETS = {
      dehradun: [48, 18],
      haridwar: [32, 24],
      'tehri-garhwal': [-24, 8],
      'pauri-garhwal': [26, 22],
      rudraprayag: [34, 2],
      chamoli: [28, -16],
      uttarkashi: [-18, -18],
      bageshwar: [18, -12],
      almora: [12, 12],
      nainital: [-18, 18],
      'udham-singh-nagar': [12, 22]
    };

    var districtMarkers = districts.features
      .filter(function (feature) { return feature.properties && feature.properties.centroid; })
      .map(function (feature) {
        var centroid = feature.properties.centroid;
        // Dense central districts need label-only offsets on a phone. Geometry stays exact.
        var labelOffset = LABEL_OFFSETS[feature.properties.slug] || [0, 0];
        var element = document.createElement('span');
        element.className = 'pp-district-label';
        element.setAttribute('aria-hidden', 'true');
        element.textContent = ${toScriptJson(language)} === 'hi'
          ? (feature.properties.nameHi || feature.properties.nameEn)
          : feature.properties.nameEn;
        var marker = new maplibregl.Marker({
          element: element,
          anchor: 'center',
          offset: labelOffset
        })
          .setLngLat([centroid.lng, centroid.lat])
          .addTo(map);
        return { marker: marker, element: element };
      });

    var STATE_BOUNDS = [
      [${UTTARAKHAND_BOUNDS[0]}, ${UTTARAKHAND_BOUNDS[1]}],
      [${UTTARAKHAND_BOUNDS[2]}, ${UTTARAKHAND_BOUNDS[3]}]
    ];

    /*
     * Frame the state, then tilt.
     *
     * fitBounds solves for a centre and zoom against the CURRENT camera, so passing pitch
     * in its options fits the box to an untilted view and then tilts away from it - which
     * is what pushed the state off the left edge. Fitting flat first and tilting after
     * keeps the whole state in frame.
     *
     * The bottom padding clears the floating tab bar; without it the southern districts
     * sit behind it.
     */
    var frameState = function () {
      map.resize();
      map.fitBounds(STATE_BOUNDS, {
        // Side room is for the district-name pills, not decorative whitespace. Without it,
        // Dehradun and Pithoragarh can be technically on-map while their labels are clipped.
        padding: { top: 180, bottom: 132, left: 48, right: 48 },
        duration: 0
      });
      if (!terrainOn) { map.setBearing(0); map.setPitch(0); }
    };

    frameState();

    /*
     * The WebView reports its final size after the first paint on iOS, so the initial fit
     * can be solved against a container of the wrong height. Re-framing on resize is what
     * makes the map open correctly rather than one gesture away from correct.
     */
    window.addEventListener('resize', frameState);

    map.on('click', function (event) {
      // A generous hit box: a 9px dot is far below a fingertip.
      var fireFeatures = map.queryRenderedFeatures(
        [[event.point.x - 14, event.point.y - 14], [event.point.x + 14, event.point.y + 14]],
        { layers: ['fire-point'] }
      );
      var fireFeature = fireFeatures && fireFeatures[0];
      if (fireFeature && fireFeature.properties && fireFeature.properties.detectionId) {
        post({ type: 'fire', detectionId: Number(fireFeature.properties.detectionId) });
        return;
      }

      var alertFeatures = map.queryRenderedFeatures(event.point, {
        layers: ['alert-point', 'alert-outline', 'alert-fill']
      });
      var alertFeature = alertFeatures && alertFeatures[0];
      if (alertFeature && alertFeature.properties && alertFeature.properties.alertId) {
        post({ type: 'alert', alertId: Number(alertFeature.properties.alertId) });
        return;
      }

      var districtFeatures = map.queryRenderedFeatures(event.point, { layers: ['district-fill'] });
      var districtFeature = districtFeatures && districtFeatures[0];
      if (districtFeature && districtFeature.properties && districtFeature.properties.slug) {
        post({ type: 'district', slug: String(districtFeature.properties.slug) });
        return;
      }

      post({ type: 'clear' });
    });

    /*
     * The control surface React Native drives, via injectJavaScript.
     *
     * Toggling visibility on layers that already exist, rather than rebuilding the document:
     * a rebuild would reload the WebView and throw away the reader's pan and zoom every time
     * they ticked a box.
     */
    var setVisible = function (id, on) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    };

    window.ppSetLayers = function (state) {
      setVisible('alert-fill', !!state.alerts);
      setVisible('alert-casing', !!state.alerts);
      setVisible('alert-outline', !!state.alerts);
      setVisible('alert-point', !!state.alerts);

      setVisible('fire-halo', !!state.fires);
      setVisible('fire-point', !!state.fires);

      setVisible('road-casing', !!state.highways);
      setVisible('road-sh', !!state.highways);
      setVisible('road-nh', !!state.highways);

      setVisible('district-fill', !!state.districts);
      setVisible('district-casing', !!state.districts);
      setVisible('district-border', !!state.districts);
      setVisible('district-selected-casing', !!state.districts);
      setVisible('district-selected', !!state.districts);
      districtMarkers.forEach(function (item) {
        item.element.style.display = state.districts ? '' : 'none';
      });
    };

    window.ppSetTerrain = function (on) {
      terrainOn = !!on;
      if (terrainOn) {
        map.setTerrain({ source: 'terrain', exaggeration: ${TERRAIN_EXAGGERATION} });
        map.easeTo({ pitch: ${TERRAIN_VIEW.pitch}, bearing: ${TERRAIN_VIEW.bearing}, duration: 600 });
      } else {
        map.setTerrain(null);
        map.easeTo({ pitch: 0, bearing: 0, duration: 400 });
      }
    };

    window.ppSelectDistrict = function (slug) {
      var filter = ['==', ['get', 'slug'], slug || ''];
      if (map.getLayer('district-selected-casing')) map.setFilter('district-selected-casing', filter);
      if (map.getLayer('district-selected')) map.setFilter('district-selected', filter);
    };

    /*
     * Zoom, driven from native buttons.
     *
     * MapLibre's own +/- control is not used: it renders at browser sizes inside a WebView,
     * which is well under the 44pt touch target a phone needs, and it cannot be styled to
     * match the app. The native buttons call this instead.
     */
    window.ppZoom = function (delta) {
      map.easeTo({ zoom: map.getZoom() + delta, duration: 200 });
    };

    window.ppFrame = frameState;

    post({ type: 'ready' });
  });
})();
</script>
</body>
</html>`;
}

/** Attribution the RN screen renders, so it uses the app's own type styles. */
export const MAP_ATTRIBUTION = ATTRIBUTION;
