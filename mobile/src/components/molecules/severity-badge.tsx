import { Badge } from '@/components/atoms';
import { useT, type TranslationKey } from '@/i18n';
import { useTheme } from '@/theme';

type Severity = 'minor' | 'moderate' | 'severe' | 'extreme' | 'unknown';

/** The severity scale in words, so it survives being read aloud or seen without colour. */
export const SEVERITY_KEY = {
  minor: 'severity.minor',
  moderate: 'severity.moderate',
  severe: 'severity.severe',
  extreme: 'severity.extreme',
  unknown: 'severity.unknown',
} as const satisfies Record<Severity, TranslationKey>;

/**
 * An alert's severity, on the shared scale.
 *
 * Severity is a data encoding: "extreme" must look identical on the home screen, the alerts
 * list and a district page, so the colour is looked up from the theme rather than passed in.
 */
export function SeverityBadge({ severity }: { severity: Severity }) {
  const theme = useTheme();
  const t = useT();

  return (
    <Badge
      label={t(SEVERITY_KEY[severity])}
      color={theme.colors.severity[severity]}
      // Solid, not soft: severity is the single most important thing on an alert card and
      // has to survive being glanced at.
      variant={severity === 'extreme' || severity === 'severe' ? 'solid' : 'soft'}
    />
  );
}
