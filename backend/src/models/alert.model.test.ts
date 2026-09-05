import { describe, expect, it } from '@jest/globals';

import { toAlert, type AlertWithAreasRow } from './alert.model.js';

/**
 * These tests exist because of a real failure: adding the `geometry` JSON column to the
 * alert SELECT changed how the driver returns the *other* JSON expression in the same query
 * (`area_ids`), from a string to an already-parsed object. `JSON.parse` on an object threw,
 * and every alert endpoint started answering 500 — with no test catching it, because the
 * tests handed the mapper strings.
 *
 * So both shapes are asserted here, deliberately.
 */
// `Record<string, unknown>` rather than `Partial<AlertWithAreasRow>`: mysql2's RowDataPacket
// carries a literal `constructor.name`, which an object literal can never satisfy.
function row(overrides: Record<string, unknown> = {}): AlertWithAreasRow {
  return {
    id: 1,
    source_id: 1,
    source_alert_id: 'IN-1788538983366009_9',
    type: 'weather',
    severity: 'moderate',
    urgency: 'expected',
    certainty: 'possible',
    status: 'active',
    headline: 'Thunder shower likely over Uttarkashi',
    body: 'Thunder shower likely over Uttarkashi',
    instruction: 'Please follow SDMA guidelines.',
    language: 'en',
    authority: 'Uttarakhand-SDMA',
    web_url: null,
    geometry: null,
    centroid_lat: null,
    centroid_lng: null,
    issued_at: '2026-09-04 16:25:10',
    effective_from: null,
    expires_at: '2026-09-04 19:18:00',
    fetched_at: '2026-09-04 18:39:13',
    area_ids: '[]',
    ...overrides,
  } as AlertWithAreasRow;
}

const areas = [{ id: 14, slug: 'uttarkashi', name_en: 'Uttarkashi', name_hi: 'उत्तरकाशी' }];
const geometry = { type: 'Polygon', coordinates: [[[79.0, 30.7]]] };

describe('toAlert', () => {
  it('reads areas returned as a JSON string', () => {
    const alert = toAlert(row({ area_ids: JSON.stringify(areas) }));

    expect(alert.areas).toHaveLength(1);
    expect(alert.areas[0]?.slug).toBe('uttarkashi');
  });

  it('reads areas returned as an already-parsed object', () => {
    const alert = toAlert(row({ area_ids: areas }));

    expect(alert.areas).toHaveLength(1);
    expect(alert.areas[0]?.name.hi).toBe('उत्तरकाशी');
  });

  it('reads geometry returned as a JSON string', () => {
    expect(toAlert(row({ geometry: JSON.stringify(geometry) })).geometry).toEqual(geometry);
  });

  it('reads geometry returned as an already-parsed object', () => {
    expect(toAlert(row({ geometry })).geometry).toEqual(geometry);
  });

  it('leaves geometry null when the source stated no affected area', () => {
    // The common case: IMD publishes an empty <cap:area>. An alert without geometry is a
    // complete alert and must not break the mapper.
    expect(toAlert(row()).geometry).toBeNull();
    expect(toAlert(row()).centroid).toBeNull();
  });

  it('builds a centroid from the two decimal columns', () => {
    const alert = toAlert(row({ centroid_lat: '30.907784', centroid_lng: '78.492254' }));

    expect(alert.centroid).toEqual({ lat: 30.907784, lng: 78.492254 });
  });

  it('ignores a half-populated centroid rather than emitting a broken point', () => {
    expect(toAlert(row({ centroid_lat: '30.907784' })).centroid).toBeNull();
  });

  it('survives unparseable JSON instead of throwing out of the repository', () => {
    const alert = toAlert(row({ area_ids: '{not json', geometry: '{not json' }));

    expect(alert.areas).toEqual([]);
    expect(alert.geometry).toBeNull();
  });

  it('drops the null row a LEFT JOIN aggregate produces for an alert with no areas', () => {
    expect(toAlert(row({ area_ids: [{ id: null }] })).areas).toEqual([]);
  });
});
