import { secureStorage, STORAGE_KEYS } from '@/lib/storage';

import { registerDevice, unregisterDevice, type RegisterDeviceInput } from './services';

let mutationQueue: Promise<void> = Promise.resolve();
let preferenceTransitions = 0;

function enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
  const next = mutationQueue.then(operation, operation);
  mutationQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

/** Prevents lifecycle reconciliation from racing an explicit Settings/Welcome choice. */
export async function runNotificationPreferenceTransition<T>(
  operation: () => Promise<T>
): Promise<T> {
  preferenceTransitions += 1;
  try {
    return await operation();
  } finally {
    preferenceTransitions -= 1;
  }
}

export function isNotificationPreferenceTransitioning(): boolean {
  return preferenceTransitions > 0;
}

function uniqueTokens(tokens: readonly (string | null)[]): string[] {
  return [
    ...new Set(tokens.filter((token): token is string => token !== null && token.length > 0)),
  ];
}

async function pendingTokens(): Promise<string[]> {
  const raw = await secureStorage.get(STORAGE_KEYS.notificationTokensPendingRemoval);
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return uniqueTokens(parsed.map((token) => (typeof token === 'string' ? token : null)));
  } catch {
    return [];
  }
}

async function writePendingTokens(tokens: readonly string[]): Promise<void> {
  const unique = uniqueTokens(tokens);
  if (unique.length === 0) {
    await secureStorage.remove(STORAGE_KEYS.notificationTokensPendingRemoval);
    return;
  }
  await secureStorage.set(
    STORAGE_KEYS.notificationTokensPendingRemoval,
    JSON.stringify(unique)
  );
}

/**
 * Registers first, then retires the old token. The order prevents a token rotation from
 * creating a period where the device is unreachable.
 */
async function registerNotificationDeviceNow(input: RegisterDeviceInput): Promise<void> {
  const previous = await secureStorage.get(STORAGE_KEYS.notificationToken);
  await registerDevice(input);

  if (previous !== null && previous !== input.token) {
    await writePendingTokens([...(await pendingTokens()), previous]);
  }
  await secureStorage.set(STORAGE_KEYS.notificationToken, input.token);
  await flushPendingNotificationUnregistrationsNow();
}

export function registerNotificationDevice(input: RegisterDeviceInput): Promise<void> {
  return enqueueMutation(() => registerNotificationDeviceNow(input));
}

/** Retries removal of tokens left behind by a failed rotation or unsubscribe. */
async function flushPendingNotificationUnregistrationsNow(): Promise<void> {
  const tokens = await pendingTokens();
  if (tokens.length === 0) return;

  const failed: string[] = [];
  for (const token of tokens) {
    try {
      await unregisterDevice(token);
    } catch {
      failed.push(token);
    }
  }
  await writePendingTokens(failed);
}

export function flushPendingNotificationUnregistrations(): Promise<void> {
  return enqueueMutation(flushPendingNotificationUnregistrationsNow);
}

/**
 * Makes an unsubscribe durable.
 *
 * The current token is copied into the retry set before any network call. If the phone is
 * offline, a later launch/foreground pass removes it instead of silently continuing to send.
 */
async function unregisterRememberedNotificationDevicesNow(): Promise<void> {
  const current = await secureStorage.get(STORAGE_KEYS.notificationToken);
  const targets = uniqueTokens([...(await pendingTokens()), current]);
  await writePendingTokens(targets);

  const failed: string[] = [];
  for (const token of targets) {
    try {
      await unregisterDevice(token);
      if (token === current) await secureStorage.remove(STORAGE_KEYS.notificationToken);
    } catch {
      failed.push(token);
    }
  }
  await writePendingTokens(failed);
}

export function unregisterRememberedNotificationDevices(): Promise<void> {
  return enqueueMutation(unregisterRememberedNotificationDevicesNow);
}
