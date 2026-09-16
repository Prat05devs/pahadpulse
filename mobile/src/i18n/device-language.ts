import { getLocales } from 'expo-localization';

import type { Language } from '@/stores/preferences.store';

/**
 * The language to start in on a first launch.
 *
 * A reader in Uttarakhand whose phone is set to Hindi should not have to find a setting to
 * read the app in Hindi. This is only the INITIAL value: once they choose in Settings, the
 * persisted preference wins and the device is never consulted again.
 *
 * Defensive because it runs before the first frame: `getLocales()` reads a native module, and
 * a locale list that is empty or shaped unexpectedly must fall back rather than crash the app
 * on launch.
 */
export function deviceLanguage(): Language {
  try {
    const [first] = getLocales();
    return first?.languageCode === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}
