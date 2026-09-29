import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type PermissionState = 'unknown' | 'granted' | 'denied' | 'unavailable';

export type NotificationTokenResult =
  { status: 'token'; token: string } | { status: 'denied' | 'unavailable' | 'configuration' };

const TOKEN_TIMEOUT_MS = 15_000;

/**
 * Android channels carry sound/vibration policy and must exist before a token is requested.
 * Recreating the same channel is idempotent and also repairs an older build's lower priority.
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

export function notificationProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId
  );
}

export async function readPermissionState(): Promise<PermissionState> {
  if (!Device.isDevice) return 'unavailable';
  const status = await Notifications.getPermissionsAsync();
  if (status.granted) return 'granted';
  return status.canAskAgain ? 'unknown' : 'denied';
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Push token request timed out.')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Returns a token or an expected reason why this build cannot have one.
 *
 * Missing EAS configuration is separate from a denied OS permission: directing a reader to
 * Settings cannot repair a build that was never linked to an Expo project.
 */
export async function obtainNotificationToken(options?: {
  askPermission?: boolean;
}): Promise<NotificationTokenResult> {
  if (!Device.isDevice) return { status: 'unavailable' };

  await ensureAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && (options?.askPermission ?? true) && current.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) return { status: 'denied' };

  const projectId = notificationProjectId();
  if (projectId === undefined) return { status: 'configuration' };

  const token = await withTimeout(
    Notifications.getExpoPushTokenAsync({ projectId }),
    TOKEN_TIMEOUT_MS
  );
  return { status: 'token', token: token.data };
}

/** Only positive integer alert IDs can become application routes. */
export function notificationAlertId(data: unknown): number | null {
  if (typeof data !== 'object' || data === null || !('alertId' in data)) return null;
  const raw = (data as { alertId?: unknown }).alertId;
  const value = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw;
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

/**
 * A fire notification carries the district slug of the detections it announces. It opens
 * the map, where the detections are, rather than a detail screen: there is no single record
 * to open, only a cluster of points. Validated like the alert id (N5).
 */
export function notificationFireDistrict(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('fireDistrict' in data)) return null;
  const raw = (data as { fireDistrict?: unknown }).fireDistrict;
  return typeof raw === 'string' && /^[a-z0-9-]{1,64}$/.test(raw) ? raw : null;
}
