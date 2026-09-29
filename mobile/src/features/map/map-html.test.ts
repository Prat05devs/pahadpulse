import { buildMapHtml } from './map-html';
import { MapMessageSchema } from './schemas';
import type { DistrictCollection, FireCollection } from './schemas';

const district: DistrictCollection = {
  type: 'FeatureCollection',
  attribution: ['© OpenStreetMap contributors'],
  features: [
    {
      type: 'Feature',
      id: 1,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [79.1, 30.1],
            [79.2, 30.1],
            [79.1, 30.2],
          ],
        ],
      },
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

const fires: FireCollection = {
  type: 'FeatureCollection',
  attribution: ['Source: NASA LANCE FIRMS, part of NASA ESDIS'],
  features: [
    {
      type: 'Feature',
      id: 9,
      geometry: { type: 'Point', coordinates: [79.45, 29.61] },
      properties: {
        detectionId: 9,
        acquiredAt: '2026-04-12T07:40:00.000Z',
        confidence: 'high',
        frpMw: 12.5,
        satellite: 'N20',
        instrument: 'VIIRS',
        dayNight: 'D',
        districtSlug: 'almora',
        districtNameEn: 'Almora',
        districtNameHi: 'अल्मोड़ा',
      },
    },
  ],
};

describe('buildMapHtml', () => {
  it('inlines the district geometry rather than fetching it in the document', () => {
    const html = buildMapHtml({ districts: district, alerts: null });
    expect(html).toContain('"slug":"chamoli"');
    // The document must never call our API itself - the app owns validation and caching.
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

  it('accepts a fire tap and rejects one without a detection id', () => {
    expect(MapMessageSchema.parse({ type: 'fire', detectionId: 9 })).toEqual({
      type: 'fire',
      detectionId: 9,
    });
    expect(MapMessageSchema.safeParse({ type: 'fire' }).success).toBe(false);
  });

  it('accepts alert and cleared-selection messages', () => {
    expect(MapMessageSchema.parse({ type: 'alert', alertId: 42 })).toEqual({
      type: 'alert',
      alertId: 42,
    });
    expect(MapMessageSchema.parse({ type: 'clear' })).toEqual({ type: 'clear' });
  });

  it('rejects an unknown message type', () => {
    expect(MapMessageSchema.safeParse({ type: 'navigate', to: '/settings' }).success).toBe(
      false
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
    expect(html).toContain('window.ppSelectDistrict = function');
  });

  it('starts the optional layers hidden', () => {
    const html = buildMapHtml({ districts: district, alerts: null });
    // The three highway layers (casing, state, and national) are opt-in.
    const hidden = html.match(/visibility: 'none'/g) ?? [];
    expect(hidden.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps district and alert fills translucent enough to preserve the basemap', () => {
    const html = buildMapHtml({ districts: district, alerts: null });
    expect(html).toContain("'fill-opacity': 0.14");
    expect(html).toContain("'published', 0.24");
    expect(html).toContain("'district', 0.12");
    expect(html).toContain("id: 'alert-outline'");
  });

  it('renders high-contrast district labels and follows the selected language', () => {
    const english = buildMapHtml({ districts: district, alerts: null, language: 'en' });
    const hindi = buildMapHtml({ districts: district, alerts: null, language: 'hi' });

    expect(english).toContain('pp-district-label');
    expect(english).toContain('"en" === \'hi\'');
    expect(hindi).toContain('"hi" === \'hi\'');
    expect(english).toContain('LABEL_OFFSETS[feature.properties.slug]');
    expect(english).toContain("item.element.style.display = state.districts ? '' : 'none'");
  });

  it('makes district and alert geometry directly actionable', () => {
    const html = buildMapHtml({ districts: district, alerts: null });
    expect(html).toContain(
      "post({ type: 'district', slug: String(districtFeature.properties.slug) })"
    );
    expect(html).toContain(
      "post({ type: 'alert', alertId: Number(alertFeature.properties.alertId) })"
    );
    expect(html).toContain("post({ type: 'clear' })");
  });

  it('draws fire detections as their own toggleable, tappable layer', () => {
    const html = buildMapHtml({ districts: district, alerts: null, fires });
    expect(html).toContain('"detectionId":9');
    expect(html).toContain("id: 'fire-point'");
    expect(html).toContain("setVisible('fire-point', !!state.fires)");
    expect(html).toContain(
      "post({ type: 'fire', detectionId: Number(fireFeature.properties.detectionId) })"
    );
  });
});
