import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useHasSeenIntro, usePreferencesHydrated } from '@/stores';

/**
 * Open the welcome once, on the first launch after install (or after the update that
 * introduced it). Waits for stored preferences to load, so a returning reader never sees it.
 */
export function useWelcomeGate() {
  const router = useRouter();
  const hydrated = usePreferencesHydrated();
  const hasSeenIntro = useHasSeenIntro();

  useEffect(() => {
    if (hydrated && !hasSeenIntro) router.push('/welcome');
    // Only on the transition to "hydrated and not seen": the welcome marks it seen on exit.
  }, [hydrated, hasSeenIntro, router]);
}
