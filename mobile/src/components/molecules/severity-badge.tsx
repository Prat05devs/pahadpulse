import { Badge } from '@/components/atoms';
import { humanise } from '@/lib/format';
import { useTheme } from '@/theme';

type Severity = 'minor' | 'moderate' | 'severe' | 'extreme' | 'unknown';

/**
 * An alert's severity, on the shared scale.
 *
 * Severity is a data encoding: "extreme" must look identical on the home screen, the alerts
 * list and a district page, so the colour is looked up from the theme rather than passed in.
 */
export function SeverityBadge({ severity }: { severity: Severity }) {
  const theme = useTheme();
  return (
    <Badge
      label={humanise(severity)}
      color={theme.colors.severity[severity]}
      // Solid, not soft: severity is the single most important thing on an alert card and
      // has to survive being glanced at.
      variant={severity === 'extreme' || severity === 'severe' ? 'solid' : 'soft'}
    />
  );
}
