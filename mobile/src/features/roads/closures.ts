import type { Translate, TranslationKey } from '@/i18n';

import type { RoadClosure, RoadClosuresReport } from './schemas';

/**
 * Presentation rules for PWD road closures, kept pure so every surface - the Roads screen,
 * the trip check, the district page - words a closure the same way. Mirrors
 * `web/src/features/roads/closures.ts`, returning translation keys instead of English.
 */

export const PWD_HELPLINE = '1364';
export const PWD_DASHBOARD_URL = 'https://mis.pwduk.in/pwd/roadClosure';

export const STATUS_LABEL: Record<RoadClosure['status'], TranslationKey> = {
  closed: 'closures.status.closed',
  partially_closed: 'closures.status.partiallyClosed',
  partially_opened: 'closures.status.partiallyOpen',
  open: 'closures.status.reopened',
  unknown: 'closures.status.unknown',
};

/** PWD's road classes, spelled out for people who do not know the acronyms. */
const ROAD_TYPE_LABEL: Record<string, TranslationKey> = {
  NH: 'closures.type.nh',
  SH: 'closures.type.sh',
  MDR: 'closures.type.mdr',
  ODR: 'closures.type.odr',
  VR: 'closures.type.vr',
  LVR: 'closures.type.lvr',
};

/** A known class spelled out in the reader's language; an unknown one as PWD sent it. */
export function roadTypeLabel(type: string | null, t: Translate): string {
  if (type === null) return t('closures.type.road');
  const key = ROAD_TYPE_LABEL[type];
  return key === undefined ? type : t(key);
}

/** "3 h", "2 d", "45 min" - how long a road has been closed, from PWD's closure time. */
export function durationSince(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} d`;
}

/** Why closures cannot be shown - each reason says what to do instead. */
export function unavailableMessage(report: RoadClosuresReport | null): {
  title: TranslationKey;
  body: TranslationKey;
} {
  if (report === null) {
    return { title: 'closures.failed.title', body: 'closures.failed.body' };
  }
  switch (report.unavailableReason) {
    case 'not_permitted':
      return { title: 'closures.notPermitted.title', body: 'closures.notPermitted.body' };
    case 'stale':
      return { title: 'closures.stale.title', body: 'closures.stale.body' };
    default:
      return { title: 'closures.unavailable.title', body: 'closures.unavailable.body' };
  }
}

/** Counts for summary tiles. Only meaningful when the report is available. */
export function closureCounts(report: RoadClosuresReport) {
  return {
    closed: report.closures.filter(
      (c) => c.status === 'closed' || c.status === 'partially_closed'
    ).length,
    partiallyOpen: report.closures.filter((c) => c.status === 'partially_opened').length,
    highways: report.closures.filter((c) => c.roadType === 'NH' || c.roadType === 'SH').length,
    reopened: report.recentlyReopened.length,
  };
}
