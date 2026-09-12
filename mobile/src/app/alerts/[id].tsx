import { useLocalSearchParams } from 'expo-router';

import { AlertDetailScreen } from '@/features/alerts';

export default function AlertRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const resolved = Array.isArray(id) ? id[0] : id;
  return <AlertDetailScreen id={Number(resolved)} />;
}
