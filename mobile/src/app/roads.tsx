import { useLocalSearchParams } from 'expo-router';

import { RoadsScreen } from '@/features/roads';
import { parseOptionalSlug } from '@/lib/route-params';

/** `/roads`, and `/roads?district=chamoli` from a district page or the trip check. */
export default function RoadsRoute() {
  const { district } = useLocalSearchParams();
  return <RoadsScreen district={parseOptionalSlug(district)} />;
}
