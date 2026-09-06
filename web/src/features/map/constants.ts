/**
 * Everything the terrain map is configured with.
 *
 * No Google Maps, and no API key anywhere in this file — that is the point of these
 * choices, not an accident. Each source below was verified reachable on 2026-09-04.
 */

/**
 * Terrain elevation tiles, `terrarium` encoding, which MapLibre decodes natively.
 *
 * Free, keyless, and served from AWS's public dataset registry. Coverage over the
 * Uttarakhand Himalaya was verified to zoom 15 (zoom 16 returns 404), which is the practical
 * ceiling of the ~30 m SRTM data underneath. That is real relief, not a photorealistic mesh:
 * Google's textured 3D Tiles are a paid product with no free equivalent, and for a hazard
 * map the landform is what matters, not building facades.
 */
export const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const TERRAIN_MAX_ZOOM = 15;
export const TERRAIN_TILE_SIZE = 256;

/** Free vector basemap, no key. Replaces the Google basemap. */
export const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export const ATTRIBUTION = [
  '© OpenStreetMap contributors',
  'Terrain: Mapzen / AWS Terrain Tiles',
].join(' · ');

/**
 * How much to exaggerate the terrain.
 *
 * 1.0 is true scale, which reads disappointingly flat on a screen because the horizontal
 * extent of a district dwarfs even a 7,000 m peak. 1.5 makes the valley-and-ridge structure
 * legible — which is the whole reason a hazard map for this state is in 3D — without
 * turning the Doon valley into a canyon.
 */
export const TERRAIN_EXAGGERATION = 1.5;

/** Uttarakhand's bounding box: [west, south, east, north]. */
export const UTTARAKHAND_BOUNDS: [number, number, number, number] = [77.4, 28.6, 81.2, 31.6];

export const UTTARAKHAND_CENTER: [number, number] = [79.3, 30.1];

export const DEFAULT_VIEW = {
  /** Tuned so the state fills the frame rather than sitting in the middle of the plains. */
  zoom: 7.35,
  /** Tilted by default. A 3D terrain map at pitch 0 is just a flat map paying for a DEM. */
  pitch: 50,
  bearing: -10,
} as const;

/** Closer and less tilted: a single district should read as a shape, not a horizon. */
export const DISTRICT_VIEW = {
  zoom: 8.6,
  pitch: 45,
  bearing: 0,
} as const;

/**
 * Alert colours, keyed by CAP severity — the scale the source itself publishes, kept rather
 * than re-invented. These deliberately match SACHET's own `severity_color` convention so a
 * user who has seen the government portal recognises them here.
 */
/**
 * Deliberately saturated. The basemap under these is tan-and-khaki hill terrain, and the
 * first version used muted earth tones that dissolved straight into it — an alert area you
 * cannot pick out is not an alert. These stay in the source's own red-orange-yellow ordering
 * but are pushed far enough in chroma to separate from any ground they land on.
 */
export const SEVERITY_COLORS: Record<string, string> = {
  extreme: '#6D0F7B',
  severe: '#C2101B',
  moderate: '#F0620E',
  minor: '#E0B100',
  unknown: '#5B6B93',
};

export const SEVERITY_LABELS: Record<string, string> = {
  extreme: 'Extreme',
  severe: 'Severe',
  moderate: 'Moderate',
  minor: 'Minor',
  unknown: 'Unspecified',
};

/**
 * Garhwal and Kumaon, the two administrative divisions, tinted apart on the district layer.
 *
 * Deepened from the original mid-tones (#2F6F62 / #3B6091) on review feedback: the state was
 * legible but sat at nearly the same weight as the surrounding plains and Nepal, so nothing
 * marked Uttarakhand as the subject of the map. Darker tones let the fill carry the state's
 * silhouette at low opacity, without the flat wash that a high opacity would put over the
 * terrain relief this map exists to show.
 */
export const DIVISION_COLORS: Record<string, string> = {
  garhwal: '#1E5348',
  kumaon: '#26456C',
};

/**
 * Drawn under the white district borders.
 *
 * The white lines alone separate districts against pale valley floors but wash out over
 * snow and cloud-bright terrain, which is most of the north. A dark casing under them gives
 * every border an edge on any ground, and — because the outer districts' casings form one
 * continuous ring — defines the state boundary itself without a separate layer.
 */
export const DISTRICT_BORDER_CASING = '#0B2A26';

/**
 * Highway colours. Distinct from the alert palette on purpose: a road is infrastructure, not
 * a warning, and reusing the severity reds would imply a road is in trouble merely by being
 * drawn.
 *
 * The state-highway yellow is a vibrant one, chosen to catch the eye. Bright yellow is the
 * hardest colour to keep legible on this basemap — the plains render near-white and the
 * terrain is tan — so the road layers draw it over a dark casing rather than desaturating
 * it. That keeps the colour as vivid as intended while still giving the line an edge.
 */
export const ROAD_COLORS: Record<'NH' | 'SH', string> = {
  NH: '#1D4ED8',
  SH: '#FFEB00',
};

/** Drawn under the highway lines so a bright colour still has an edge on pale ground. */
export const ROAD_CASING = '#3A2E00';
