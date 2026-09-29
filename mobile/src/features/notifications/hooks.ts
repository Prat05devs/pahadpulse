import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { useLanguage, usePreferencesStore } from '@/stores';

import {
  registerNotificationDevice,
  runNotificationPreferenceTransition,
  unregisterRememberedNotificationDevices,
} from './registration';
import { obtainNotificationToken, readPermissionState, type PermissionState } from './runtime';

export type NotificationEnableFailure =
  'denied' | 'unavailable' | 'configuration' | 'registration';

export type NotificationEnableResult =
  { enabled: true } | { enabled: false; reason: NotificationEnableFailure };

/**
 * User-facing notification controls.
 *
 * App-wide token refresh and tap routing live in `NotificationCoordinator`; keeping them out
 * of this hook means they run even when Settings and Welcome have never been opened.
 */
export function useAlertNotifications() {
  const language = useLanguage();
  const enabled = usePreferencesStore((state) => state.notificationsEnabled);
  const setEnabled = usePreferencesStore((state) => state.setNotificationsEnabled);
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    const refreshPermission = () => {
      void readPermissionState().then(
        (state) => {
          if (mounted) setPermission(state);
        },
        () => {
          // An OS query failure is transient. Do not turn a prior consent choice off because
          // a native module failed to answer once.
          if (mounted) setPermission('unknown');
        }
      );
    };

    refreshPermission();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshPermission();
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const enable = useCallback(async (): Promise<NotificationEnableResult> => {
    setBusy(true);
    try {
      return await runNotificationPreferenceTransition(async () => {
        const result = await obtainNotificationToken();
        if (result.status !== 'token') {
          if (result.status === 'denied') setPermission('denied');
          if (result.status === 'unavailable') setPermission('unavailable');
          setEnabled(false);
          return { enabled: false, reason: result.status };
        }

        await registerNotificationDevice({
          token: result.token,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          language,
        });
        setPermission('granted');
        setEnabled(true);
        return { enabled: true };
      });
    } catch {
      // A failed registration must not leave the switch claiming notifications are on.
      setEnabled(false);
      return { enabled: false, reason: 'registration' };
    } finally {
      setBusy(false);
    }
  }, [language, setEnabled]);

  const disable = useCallback(async (): Promise<void> => {
    setBusy(true);
    try {
      await runNotificationPreferenceTransition(async () => {
        // Local consent takes effect before the network request. The app-level handler also
        // suppresses foreground banners immediately, even when unregistering must retry later.
        setEnabled(false);
        await unregisterRememberedNotificationDevices();
      });
    } finally {
      setBusy(false);
    }
  }, [setEnabled]);

  return { enabled, permission, busy, enable, disable };
}

export type { PermissionState } from './runtime';
