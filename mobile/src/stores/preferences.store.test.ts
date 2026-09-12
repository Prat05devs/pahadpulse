import { usePreferencesStore } from './preferences.store';

/**
 * A Zustand store is a plain module, not a React tree, so these call it directly rather than
 * wrapping in `act` — `set` is synchronous and there is no render to flush.
 */
const store = () => usePreferencesStore.getState();

beforeEach(() => {
  store().reset();
});

describe('preferences store', () => {
  it('starts with sensible defaults', () => {
    expect(store().language).toBe('en');
    expect(store().themeMode).toBe('system');
    expect(store().savedDistricts).toEqual([]);
  });

  it('toggles a district on and off', () => {
    store().toggleSavedDistrict('dehradun');
    expect(store().savedDistricts).toEqual(['dehradun']);

    store().toggleSavedDistrict('dehradun');
    expect(store().savedDistricts).toEqual([]);
  });

  it('keeps followed districts in the order they were added', () => {
    // The home screen shows the first one, so insertion order is user-visible.
    store().toggleSavedDistrict('nainital');
    store().toggleSavedDistrict('almora');

    expect(store().savedDistricts).toEqual(['nainital', 'almora']);
  });

  it('removes only the district named', () => {
    store().toggleSavedDistrict('nainital');
    store().toggleSavedDistrict('almora');
    store().toggleSavedDistrict('nainital');

    expect(store().savedDistricts).toEqual(['almora']);
  });

  it('resets every field, including followed districts', () => {
    store().setLanguage('hi');
    store().setThemeMode('dark');
    store().toggleSavedDistrict('pauri-garhwal');
    store().markIntroSeen();

    store().reset();

    expect(store().language).toBe('en');
    expect(store().themeMode).toBe('system');
    expect(store().savedDistricts).toEqual([]);
    expect(store().hasSeenIntro).toBe(false);
  });

  it('keeps its actions after a reset', () => {
    // `partialize` persists data only. If actions were ever clobbered by rehydration, this
    // is where it would show up.
    store().reset();
    expect(typeof store().toggleSavedDistrict).toBe('function');
  });
});
