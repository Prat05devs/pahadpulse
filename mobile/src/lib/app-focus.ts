import { focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Tell TanStack Query when the app is in the foreground.
 *
 * Without this nothing ever marks the app focused or unfocused on React Native: the default
 * focus manager listens for browser `visibilitychange`, which does not exist here. So
 * `refetchOnWindowFocus` — and every `refetchOnMount` decision that depends on focus — was
 * inert, and the query client's own comment about refetching "when the app returns to the
 * foreground" described behaviour the app did not have. A reader who backgrounded the app
 * during a storm and came back an hour later saw the hour-old alert list.
 *
 * Returns its own unsubscribe so the caller can clean up (a subscription that outlives its
 * owner is the classic React Native leak).
 */
export function subscribeToAppFocus(): () => void {
  const handler = (status: AppStateStatus): void => {
    focusManager.setFocused(status === 'active');
  };

  const subscription = AppState.addEventListener('change', handler);
  // Seed the initial value: the app is already foregrounded by the time this runs.
  focusManager.setFocused(AppState.currentState === 'active');

  return () => {
    subscription.remove();
  };
}

/*
 * Not wired here, deliberately: connectivity.
 *
 * `onlineManager` defaults to permanently online on React Native, so `refetchOnReconnect`
 * never fires and a query is never paused for being offline — a failure is only discovered by
 * making a request and watching it time out. Doing it properly needs
 * `@react-native-community/netinfo`, which is a native module and therefore a store build, so
 * it is not added without asking first.
 */
