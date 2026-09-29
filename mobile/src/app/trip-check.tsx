import { useLocalSearchParams } from 'expo-router';

import { TripCheckScreen } from '@/features/trip-check';
import { parseDateParam, parseOptionalSlug } from '@/lib/route-params';

/** `/trip-check?to=kedarnath&date=2026-09-28`, the same link shape as the web portal. */
export default function TripCheckRoute() {
  const { to, date } = useLocalSearchParams();
  return (
    <TripCheckScreen initialTo={parseOptionalSlug(to)} initialDate={parseDateParam(date)} />
  );
}
