import { buildMapHtml } from './map-html';
import { MapMessageSchema } from './schemas';
import type { DistrictCollection } from './schemas';

const district: DistrictCollection = {
  type: 'FeatureCollection',
  attribution: ['© OpenStreetMap contributors'],
  features: [
    {
      type: 'Feature',
      id: 1,
      geometry: { type: 'Polygon', coordinates: [[[79.1, 30.1], [79.2, 30.1], [79.1, 30.2]]] },
      properties: {
        areaId: 1,
        slug: 'chamoli',
        nameEn: 'Chamoli',
        nameHi: 'चमोली',
        division: 'garhwal',
        centroid: { lat: 30.1, lng: 79.1 },
        isPlaceholder: false,
        sourceNote: 'OSM via Overpass',
      },
    },
  ],
};

describe('buildMapHtml', () => {
  it('inlines the district geometry rather than fetching it in the document', () => {
    const html = buildMapHtml({ districts: district, alerts: null });
    expect(html).toContain('"slug":"chamoli"');
    // The document must never call our API itself — the app owns validation and caching.
    expect(html).not.toContain('/api/');
  });

  it('renders an empty collection when a layer has no data', () => {
    // The alerts layer is optional: with none active the map is still the state in relief.
    const html = buildMapHtml({ districts: district, alerts: null });
    expect(html).toContain('"type":"FeatureCollection","features":[]');
  });

  it('escapes a closing script tag hidden in the data', () => {
    // The guard this exists for: `</script>` inside a string ends the script element early,
    // turning the rest of the map code into page text.
    const hostile: DistrictCollection = {
      ...district,
      features: [
        {
          ...district.features[0]!,
          properties: {
            ...district.features[0]!.properties,
            sourceNote: '</script><script>globalThis.pwned = true;</script>',
          },
        },
      ],
    };

    const html = buildMapHtml({ districts: hostile, alerts: null });
    expect(html).not.toContain('</script><script>');
    expect(html).toContain('\\u003c/script');
  });

  it('pins the library version so the two apps cannot drift', () => {
    const html = buildMapHtml({ districts: null, alerts: null });
    expect(html).toContain('maplibre-gl/5.24.0/maplibre-gl.js');
  });
});

describe('MapMessageSchema', () => {
  it('accepts a district tap', () => {
    expect(MapMessageSchema.parse({ type: 'district', slug: 'almora' })).toEqual({
      type: 'district',
      slug: 'almora',
    });
  });

  it('rejects a district message with no slug, rather than navigating nowhere', () => {
    expect(MapMessageSchema.safeParse({ type: 'district', slug: '' }).success).toBe(false);
  });

  it('rejects an unknown message type', () => {
    expect(MapMessageSchema.safeParse({ type: 'navigate', to: '/settings' }).success).toBe(
      false,
    );
  });
});



describe('the document control surface', () => {
  it('exposes the functions the screen injects', () => {
    // These names are a contract with map-screen.tsx: renaming one silently breaks every
    // toggle, because injectJavaScript fails quietly in the WebView.
    const html = buildMapHtml({ districts: district, alerts: null });
    expect(html).toContain('window.ppSetLayers = function');
    expect(html).toContain('window.ppSetTerrain = function');
  });

  it('starts the optional layers hidden', () => {
    const html = buildMapHtml({ districts: district, alerts: null });
    // The three highway layers (casing, state, and national) are opt-in.
    const hidden = html.match(/visibility: 'none'/g) ?? [];
    expect(hidden.length).toBeGreaterThanOrEqual(3);
  });
});
