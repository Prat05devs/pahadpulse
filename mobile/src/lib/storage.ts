import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Two storage tiers, deliberately separated.
 *
 * `storage`  — ordinary device storage. Preferences, cached responses, anything a person
 *              could read off a rooted phone without it mattering.
 * `secureStorage` — Keychain (iOS) / Keystore (Android). Tokens and nothing else.
 *
 * Keeping them apart is what stops a credential being written to the wrong tier by habit.
 * Every method swallows failure and returns `null` rather than throwing: storage is not
 * guaranteed on a device that is out of space, and losing a saved district must never be
 * the thing that crashes a public information app.
 */

export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Non-fatal by design. See the note above.
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Non-fatal by design.
    }
  },
};

/**
 * SecureStore has no web implementation. Falling back to `AsyncStorage` there would put a
 * token in `localStorage` while the name still promised the Keychain, so the web build is
 * given a no-op instead: it stores nothing and reads nothing, which is honest.
 */
const secureUnavailable = Platform.OS === 'web';

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (secureUnavailable) return null;
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    if (secureUnavailable) return;
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch {
      // Non-fatal by design.
    }
  },

  async remove(key: string): Promise<void> {
    if (secureUnavailable) return;
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Non-fatal by design.
    }
  },
};

/**
 * Every persisted key in the app, in one place.
 *
 * Namespaced with a version segment so a future migration can leave old data behind rather
 * than trying to read a shape that no longer exists.
 */
export const STORAGE_KEYS = {
  preferences: 'pp.v1.preferences',
  queryCache: 'pp.v1.query-cache',
} as const;
