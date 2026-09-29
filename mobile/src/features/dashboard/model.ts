// From the schema file, not the feature barrel: the barrel also exports screens, and this
// module has to stay importable in a plain unit test.
import {
  isAlertInForce,
  SEVERITY_RANK,
  type Alert,
  type AlertSeverity,
} from '@/features/alerts/schemas';

/**
 * Pure logic behind the Today screen's status colours.
 *
 * Every status here is a statement about official warnings - "a severe warning is in force
 * for Chamoli" - never a verdict on whether a place or a road is safe. The absence of a
 * warning is reported as exactly that.
 */

type AlertLike = Pick<Alert, 'severity' | 'status' | 'expiresAt'>;

/** How a status is drawn: no warning, a warning worth noting, or a severe one. */
export type StatusTone = 'clear' | 'caution' | 'danger';

/** The most severe warning still in force, or null when none is. */
export function highestSeverity(
  alerts: readonly AlertLike[],
  now = Date.now()
): AlertSeverity | null {
  let highest: AlertSeverity | null = null;
  for (const alert of alerts) {
    if (!isAlertInForce(alert, now)) continue;
    if (highest === null || SEVERITY_RANK[alert.severity] > SEVERITY_RANK[highest]) {
      highest = alert.severity;
    }
  }
  return highest;
}

export function severityTone(severity: AlertSeverity | null): StatusTone {
  if (severity === null) return 'clear';
  return severity === 'severe' || severity === 'extreme' ? 'danger' : 'caution';
}

/** Warnings that name the given area among the places they cover. */
export function alertsForArea<T extends Pick<Alert, 'areas'>>(
  alerts: readonly T[],
  slug: string
) {
  return alerts.filter((alert) => alert.areas.some((area) => area.slug === slug));
}

/**
 * Severe and extreme warnings in force, most severe first, then newest first.
 *
 * These are the ones the home screen raises into its banner. A moderate warning is still
 * counted in the signal tile and listed on the alerts tab, but does not take the top of the
 * screen.
 */
export function urgentAlerts<T extends AlertLike & Pick<Alert, 'issuedAt'>>(
  alerts: readonly T[],
  now = Date.now()
): T[] {
  return alerts
    .filter((alert) => severityTone(alert.severity) === 'danger' && isAlertInForce(alert, now))
    .sort(
      (a, b) =>
        SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
        // `YYYY-MM-DD HH:mm:ss` sorts correctly as a string.
        b.issuedAt.localeCompare(a.issuedAt)
    );
}

/**
 * The tourism guide names a place's district in English ("Rudraprayag"); alerts name areas
 * by slug. This joins the two through the district list.
 */
export function districtSlugByName(
  districts: readonly { slug: string; name: { en: string } }[],
  name: string
): string | null {
  const wanted = name.trim().toLowerCase();
  return (
    districts.find((district) => district.name.en.trim().toLowerCase() === wanted)?.slug ?? null
  );
}
