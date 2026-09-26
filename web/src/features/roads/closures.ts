import type { RoadClosure, RoadClosuresReport } from './schemas';

/**
 * Presentation rules for PWD road closures, kept pure so every surface — the Roads page, the
 * trip check, the homepage card — words a closure the same way.
 */

export const STATUS_LABEL: Record<RoadClosure['status'], string> = {
  closed: 'Closed',
  partially_closed: 'Partially closed',
  partially_opened: 'Partially open',
  open: 'Reopened',
  unknown: 'Status unclear',
};

/** PWD's road classes, spelled out for people who do not know the acronyms. */
export const ROAD_TYPE_LABEL: Record<string, string> = {
  NH: 'National highway',
  SH: 'State highway',
  MDR: 'Major district road',
  ODR: 'Other district road',
  VR: 'Village road',
  LVR: 'Link village road',
};

export const roadTypeLabel = (type: string | null) =>
  type === null ? 'Road' : (ROAD_TYPE_LABEL[type] ?? type);

export const formatIst = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

/** "3 h", "2 d", "45 min" — how long a road has been closed, from PWD's closure time. */
export function durationSince(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} days`;
}

/** Why closures cannot be shown — each reason says what to do instead. */
export function unavailableMessage(report: RoadClosuresReport): { title: string; body: string } {
  switch (report.unavailableReason) {
    case 'not_permitted':
      return {
        title: 'Live road closures are coming soon',
        body: 'Pahad Pulse reads closures reported to PWD Uttarakhand and will show them once PWD grants permission to republish. Until then, check PWD’s own dashboard or call 1364 before you travel.',
      };
    case 'stale':
      return {
        title: 'Road closure data is out of date',
        body: 'Our last check with PWD is too old to rely on — a road may have reopened or closed since. Check PWD’s dashboard or call 1364 for current status.',
      };
    default:
      return {
        title: 'Road closures are not available right now',
        body: 'Check PWD’s dashboard or call 1364 for current road status before you travel.',
      };
  }
}

/** Counts for summary tiles. Only meaningful when the report is available. */
export function closureCounts(report: RoadClosuresReport) {
  return {
    closed: report.closures.filter((c) => c.status === 'closed' || c.status === 'partially_closed')
      .length,
    partiallyOpen: report.closures.filter((c) => c.status === 'partially_opened').length,
    highways: report.closures.filter((c) => c.roadType === 'NH' || c.roadType === 'SH').length,
    reopened: report.recentlyReopened.length,
  };
}
