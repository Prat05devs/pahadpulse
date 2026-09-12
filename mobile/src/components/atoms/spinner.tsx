import { ActivityIndicator } from 'react-native';

import { useTheme } from '@/theme';

export function Spinner({ size = 'small' }: { size?: 'small' | 'large' }) {
  const theme = useTheme();
  return <ActivityIndicator size={size} color={theme.colors.primary} />;
}
