/**
 * The store barrel. Import stores from here, not from their files, so a store can be split
 * or renamed without touching every screen.
 */
export {
  usePreferencesStore,
  useLanguage,
  useThemeMode,
  useSavedDistricts,
  useIsDistrictSaved,
  useHasSeenIntro,
  usePreferencesHydrated,
  type Language,
  type ThemeMode,
} from './preferences.store';
