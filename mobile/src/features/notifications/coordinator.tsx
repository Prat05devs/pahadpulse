import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { usePreferencesHydrated, usePreferencesStore } from '@/stores';

import {
  isNotificationPreferenceTransitioning,
  registerNotificationDevice,
  unregisterRememberedNotificationDevices,
} from './registration';
import {
  notificationAlertId,
  notificationFireDistrict,
  obtainNotificationToken,
} from './runtime';

/**
 * Honour the local switch even while a server-side unsubscribe is waiting for connectivity.
 * A notification may still reach the OS, but it must not interrupt someone who turned it off.
 */
async function notificationPreferenceAfterHydration(): Promise<boolean> {
  if (!usePreferencesStore.persist.hasHydrated()) {
    // AsyncStorage normally hydrates in a few milliseconds. Waiting briefly prevents the
    // initial default (`false`) from hiding an alert for someone whose persisted choice is
    // on during a cold launch, while still answering the OS handler promptly if storage stalls.
    await new Promise<void>((resolve) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let unsubscribe: () => void = () => undefined;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (timer !== undefined) clearTimeout(timer);
        unsubscribe();
        resolve();
      };
      unsubscribe = usePreferencesStore.persist.onFinishHydration(finish);
      timer = setTimeout(finish, 1_000);
    });
  }
  return usePreferencesStore.getState().notificationsEnabled;
}

Notifications.setNotificationHandler({
  handleNotification: async () => {
    const enabled = await notificationPreferenceAfterHydration();
    return Promise.resolve({
      shouldShowBanner: enabled,
      shouldShowList: enabled,
      shouldPlaySound: enabled,
      shouldSetBadge: false,
    });
  },
});

/**
 * App-root notification lifecycle.
 *
 * This component is deliberately headless and mounted beside the root Stack: token rotation,
 * permission reconciliation and notification taps must work on every route, not only while
 * the notification setting happens to be visible.
 */
export function NotificationCoordinator() {
  const navigationState = useRootNavigationState();
  const preferencesHydrated = usePreferencesHydrated();
  const enabled = usePreferencesStore((state) => state.notificationsEnabled);
  const language = usePreferencesStore((state) => state.language);
  const setEnabled = usePreferencesStore((state) => state.setNotificationsEnabled);
  const handledResponses = useRef(new Set<string>());

  const synchronizeRegistration = useCallback(async () => {
    if (!preferencesHydrated || isNotificationPreferenceTransitioning()) return;
    if (!enabled) {
      await unregisterRememberedNotificationDevices();
      return;
    }

    try {
      // Never prompt from an app lifecycle callback. Only an explicit button may ask.
      const result = await obtainNotificationToken({ askPermission: false });
      if (result.status === 'token') {
        // The user may have switched notifications off while the native token request was
        // in flight. The explicit transition owns the final register/unregister operation.
        if (
          isNotificationPreferenceTransitioning() ||
          !usePreferencesStore.getState().notificationsEnabled
        ) {
          return;
        }
        await registerNotificationDevice({
          token: result.token,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          language,
        });
        return;
      }

      // Permission revoked, simulator install, or an unconfigured release build: the server
      // must no longer retain a token while the UI claims the choice is active.
      setEnabled(false);
      await unregisterRememberedNotificationDevices();
    } catch {
      // Keep prior consent and registration intact during a transient network/native error.
      // The next foreground event and the next launch both retry.
    }
  }, [enabled, language, preferencesHydrated, setEnabled]);

  useEffect(() => {
    void synchronizeRegistration();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void synchronizeRegistration();
    });
    const token = Notifications.addPushTokenListener(() => {
      if (enabled) void synchronizeRegistration();
    });
    return () => {
      appState.remove();
      token.remove();
    };
  }, [enabled, synchronizeRegistration]);

  useEffect(() => {
    if (navigationState?.key === undefined) return;

    const openResponse = (response: Notifications.NotificationResponse): boolean => {
      const requestId = response.notification.request.identifier;
      if (handledResponses.current.has(requestId)) return false;

      const data = response.notification.request.content.data;
      const alertId = notificationAlertId(data);
      if (alertId !== null) {
        handledResponses.current.add(requestId);
        router.push({ pathname: '/alerts/[id]', params: { id: String(alertId) } });
        return true;
      }

      if (notificationFireDistrict(data) === null) return false;
      handledResponses.current.add(requestId);
      router.push('/map');
      return true;
    };

    // Covers a tap that launched a terminated app. The live listener below covers taps while
    // the app is foregrounded/backgrounded; the request identifier prevents double routing.
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response !== null && openResponse(response)) {
          return Notifications.clearLastNotificationResponseAsync();
        }
        return undefined;
      })
      .catch(() => undefined);

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (openResponse(response)) {
          // A response handled while the process is alive can otherwise be returned again as
          // the "last" response after the next cold start and reopen the same warning.
          void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
        }
      }
    );
    return () => responseSubscription.remove();
  }, [navigationState?.key]);

  return null;
}
