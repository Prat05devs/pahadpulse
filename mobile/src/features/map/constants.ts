/**
 * Everything the terrain map is configured with.
 *
 * Mirrors `web/src/features/map/constants.ts`. No API key anywhere in this file — that is
 * the point of these choices, not an accident: every source below is free and keyless, and
 * the mobile map deliberately renders the same stack the web map does rather than swapping
 * in a platform basemap that would look nothing like it.
 */

/** Terrain elevation tiles, `terrarium` encoding, which MapLibre decodes natively. */
export const TERRAIN_TILES =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const TERRAIN_MAX_ZOOM = 15;
export const TERRAIN_TILE_SIZE = 256;

/** Free vector basemap, no key. */
export const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/**
 * maplibre-gl, pinned and loaded from a CDN into the WebView.
 *
 * Pinned to the exact version the web app depends on so the two maps cannot drift in
 * rendering behaviour. Loaded rather than bundled because Metro cannot bundle a library
 * that expects a DOM — the WebView is a browser, and this is the browser's copy.
 */
export const MAPLIBRE_VERSION = '5.24.0';
export const MAPLIBRE_JS = `https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/${MAPLIBRE_VERSION}/maplibre-gl.js`;
export const MAPLIBRE_CSS = `https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/${MAPLIBRE_VERSION}/maplibre-gl.css`;

export const ATTRIBUTION = [
  '© OpenStreetMap contributors',
  'Terrain: Mapzen / AWS Terrain Tiles',
].join(' · ');

/**
 * How much to exaggerate the terrain. 1.0 is true scale, which reads flat on a screen
 * because the horizontal extent of a district dwarfs even a 7,000 m peak.
 */
export const TERRAIN_EXAGGERATION = 1.5;

/** Uttarakhand's bounding box: [west, south, east, north]. */
export const UTTARAKHAND_BOUNDS: [number, number, number, number] = [77.4, 28.6, 81.2, 31.6];

export const UTTARAKHAND_CENTER: [number, number] = [79.3, 30.1];

/**
 * The phone's default view.
 *
 * Zoom is lower than the web's 7.35: a phone screen is far narrower than a desktop map
 * frame, and at the web zoom the state overflows the sides. Pitch is a little shallower for
 * the same reason — a steep tilt on a tall, narrow viewport pushes most of the state into
 * the compressed far distance.
 */
export const DEFAULT_VIEW = {
  zoom: 6.4,
  pitch: 45,
  bearing: -10,
} as const;

/** Alert colours, keyed by CAP severity — the scale the source itself publishes. */
export const SEVERITY_COLORS: Record<string, string> = {
  extreme: '#6D0F7B',
  severe: '#C2101B',
  moderate: '#F0620E',
  minor: '#E0B100',
  unknown: '#5B6B93',
};

/** Garhwal and Kumaon, the two administrative divisions, tinted apart. */
export const DIVISION_COLORS: Record<string, string> = {
  garhwal: '#1E5348',
  kumaon: '#26456C',
};

/** Drawn under the white district borders so they hold an edge over snow-bright terrain. */
export const DISTRICT_BORDER_CASING = '#0B2A26';

/**
 * Highway colours. Distinct from the alert palette on purpose: a road is infrastructure, not
 * a warning, and reusing the severity reds would imply a road is in trouble merely by being
 * drawn.
 */
export const ROAD_COLORS: Record<'NH' | 'SH', string> = {
  NH: '#1D4ED8',
  SH: '#FFEB00',
};

/** Drawn under the highway lines so a bright colour still has an edge on pale ground. */
export const ROAD_CASING = '#3A2E00';

/**
 * Hillshade, which is how this map shows relief while staying flat.
 *
 * The web map's default is 2D for a reason worth repeating here: a pitched map makes the
 * northern districts recede and read as smaller than they are, which is the opposite of what
 * a map of this state should say. Hillshade gives the landform without that distortion, and
 * the 3D tilt stays available as a deliberate choice.
 */
export const HILLSHADE = {
  exaggeration: 0.35,
  shadow: '#3d4a52',
  highlight: '#ffffff',
} as const;

/** Tilt applied when the reader turns 3D on. */
export const TERRAIN_VIEW = { pitch: 50, bearing: -10 } as const;

/**
 * The out-migration choropleth ramp.
 *
 * Sequential, single-hue and dark-at-the-top: the quantity has one direction — more people
 * left — so a diverging palette would invent a midpoint the data does not have. Kept off the
 * alert reds and the highway blue/yellow so three layers can be on at once and still be told
 * apart.
 */
export const MIGRATION_COLORS = ['#F2E6DA', '#DFC3A0', '#C79A6B', '#A97142', '#7A4A1E'];
