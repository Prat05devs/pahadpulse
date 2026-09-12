import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/lib/storage';

/**
 * CLIENT state only — what this person has chosen.
 *
 * The rule that keeps this store small: if the API is the source of truth, it does NOT
 * belong here. Districts, alerts and readings live in TanStack Query, which already handles
 * caching, refetching and staleness. Duplicating server data into Zustand means two copies
 * that disagree the moment one refreshes.
 *
 * What belongs here is the handful of things the server has no opinion about: the language
 * the reader picked, the districts they follow, whether they want dark mode.
 */

export type Language = 'en' | 'hi';
export type ThemeMode = 'system' | 'light' | 'dark';

type PreferencesState = {
  language: Language;
  themeMode: ThemeMode;
  /** District slugs the reader follows, in the order they added them. */
  savedDistricts: string[];
  /** Set once the intro has been dismissed, so it is never shown twice. */
  hasSeenIntro: boolean;

  setLanguage: (language: Language) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleSavedDistrict: (slug: string) => void;
  markIntroSeen: () => void;
  reset: () => void;
};

const INITIAL = {
  language: 'en' as Language,
  themeMode: 'system' as ThemeMode,
  savedDistricts: [] as string[],
  hasSeenIntro: false,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...INITIAL,

      setLanguage: (language) => set({ language }),

      setThemeMode: (themeMode) => set({ themeMode }),

      toggleSavedDistrict: (slug) =>
        set((state) => ({
          savedDistricts: state.savedDistricts.includes(slug)
            ? state.savedDistricts.filter((s) => s !== slug)
            : [...state.savedDistricts, slug],
        })),

      markIntroSeen: () => set({ hasSeenIntro: true }),

      reset: () => set(INITIAL),
    }),
    {
      name: STORAGE_KEYS.preferences,
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      /**
       * Only the data is persisted, never the actions. Without this the rehydrated object
       * would overwrite the live functions with whatever JSON.parse produced for them.
       */
      partialize: (state) => ({
        language: state.language,
        themeMode: state.themeMode,
        savedDistricts: state.savedDistricts,
        hasSeenIntro: state.hasSeenIntro,
      }),
    }
  )
);

/**
 * Atomic selectors.
 *
 * Subscribing with `usePreferencesStore()` re-renders a component on EVERY preference
 * change — a district card would repaint because the theme changed. Exporting one selector
 * per field makes the narrow subscription the easy thing to reach for.
 *
 * Each is a stable module-level reference, so it never re-subscribes on re-render.
 */
export const selectLanguage = (s: PreferencesState) => s.language;
export const selectThemeMode = (s: PreferencesState) => s.themeMode;
export const selectSavedDistricts = (s: PreferencesState) => s.savedDistricts;
export const selectHasSeenIntro = (s: PreferencesState) => s.hasSeenIntro;

export const useLanguage = () => usePreferencesStore(selectLanguage);
export const useThemeMode = () => usePreferencesStore(selectThemeMode);
export const useSavedDistricts = () => usePreferencesStore(selectSavedDistricts);

/**
 * Whether one district is followed.
 *
 * Returns a boolean rather than the array so a card re-renders only when ITS OWN saved state
 * changes, not when any other district is added or removed.
 */
export const useIsDistrictSaved = (slug: string) =>
  usePreferencesStore((s) => s.savedDistricts.includes(slug));
