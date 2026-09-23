import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { useLanguage, usePreferencesStore } from '@/stores';

import { registerDevice, unregisterDevice } from './services';

/**
 * Alert notifications.
 *
 * WHAT THE READER IS AGREEING TO. One notification per new public warning for Uttarakhand,
 * as published by SACHET/NDMA. Not an emergency service: the state's own channels reach
 * people this app has never heard of, and a phone that is off, out of coverage or has
 * notifications disabled will miss one. The settings screen says so next to the switch.
 *
 * The token is the only thing sent. No account exists to attach it to, and none is wanted.
 */

/** A notification that arrives while the app is open still belongs on screen. */
Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
});

/**
 * Android needs a channel before anything is delivered, and the channel is what carries the
 * importance — a warning should be able to make a sound and appear over what the reader is
 * doing, which `MAX` allows and the default channel does not.
 */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('alerts', {
    name: 'Public alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

function projectId(): string | undefined {
  // EAS sets this at build time; it is what Expo's push service uses to address the app.
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId
  );
}

export type PermissionState = 'unknown' | 'granted' | 'denied';

export function useAlertNotifications() {
  const language = useLanguage();
  const enabled = usePreferencesStore((state) => state.notificationsEnabled);
  const setEnabled = usePreferencesStore((state) => state.setNotificationsEnabled);
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Notifications.getPermissionsAsync().then((status) => {
      setPermission(status.granted ? 'granted' : status.canAskAgain ? 'unknown' : 'denied');
    });
  }, []);

  /**
   * Re-registers on every launch while switched on.
   *
   * A push token is not stable: it changes on reinstall, on restore to a new phone, and
   * occasionally on its own. Registering once at opt-in would leave those devices silently
   * unreachable, and the reader would have no way to tell.
   */
  useEffect(() => {
    if (!enabled) return;
    void (async () => {
      // Never prompts: this runs on every launch, and a reader who revoked the permission
      // must not be asked again by the app simply starting.
      const token = await obtainToken({ askPermission: false });
      if (token === null) return;
      await registerDevice({
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        language,
      }).catch(() => undefined);
    })();
  }, [enabled, language]);

  /** Opening the app from a notification goes to that warning, not to the dashboard. */
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { alertId?: unknown };
      if (typeof data.alertId === 'number') {
        router.push(`/alerts/${data.alertId}`);
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const enable = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    try {
      const token = await obtainToken();
      if (token === null) {
        setPermission('denied');
        return false;
      }
      setPermission('granted');
      await registerDevice({
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        language,
      });
      setEnabled(true);
      return true;
    } catch {
      // A failed registration must not leave the switch claiming notifications are on.
      setEnabled(false);
      return false;
    } finally {
      setBusy(false);
    }
  }, [language, setEnabled]);

  const disable = useCallback(async (): Promise<void> => {
    setBusy(true);
    // Switched off locally first: the reader's choice must not wait on a network call, and
    // a failed unregister is recoverable — the next enable re-registers the same token.
    setEnabled(false);
    try {
      const token = await obtainToken({ askPermission: false });
      if (token !== null) await unregisterDevice(token);
    } catch {
      // Nothing to recover: the device simply keeps receiving until it next registers.
    } finally {
      setBusy(false);
    }
  }, [setEnabled]);

  return { enabled, permission, busy, enable, disable };
}

/**
 * The device's push token, or null when it cannot have one.
 *
 * Null is a normal answer, not a failure: a simulator has no push token, and a reader can
 * decline the permission. Callers treat it as "notifications are not available here".
 */
async function obtainToken(options?: { askPermission?: boolean }): Promise<string | null> {
  if (!Device.isDevice) return null;

  await ensureAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && (options?.askPermission ?? true) && current.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) return null;

  const id = projectId();
  const token = await Notifications.getExpoPushTokenAsync(
    id === undefined ? {} : { projectId: id }
  );
  return token.data;
}
