import { describe, expect, it } from 'vitest';
import { closureCounts, durationSince, roadTypeLabel, unavailableMessage } from './closures';
import type { RoadClosure, RoadClosuresReport } from './schemas';

const closure = (overrides: Partial<RoadClosure>): RoadClosure => ({
  id: 1,
  roadName: 'Tarikhet to Pipali Motor Road',
  roadType: 'VR',
  kmMarkers: '7',
  department: 'PMGSY',
  division: 'PMGSY',
  district: { slug: 'almora', name: 'Almora' },
  status: 'closed',
  closedAt: '2026-09-26T03:28:00.000Z',
  expectedOpenAt: '2026-09-26T12:28:00.000Z',
  estimatePassed: false,
  statusSeenAt: '2026-09-26T03:30:00.000Z',
  ...overrides,
});

const report = (overrides: Partial<RoadClosuresReport>): RoadClosuresReport => ({
  available: true,
  unavailableReason: null,
  checkedAt: '2026-09-26T04:29:14.000Z',
  closures: [],
  recentlyReopened: [],
  source: { department: 'PWD', url: 'https://mis.pwduk.in/pwd/roadClosure', attribution: 'PWD' },
  ...overrides,
});

describe('road closure presentation', () => {
  it('spells out road classes', () => {
    expect(roadTypeLabel('NH')).toBe('National highway');
    expect(roadTypeLabel('VR')).toBe('Village road');
    expect(roadTypeLabel(null)).toBe('Road');
    expect(roadTypeLabel('XYZ')).toBe('XYZ');
  });

  it('describes how long a road has been closed', () => {
    const now = new Date('2026-09-26T06:00:00Z');
    expect(durationSince('2026-09-26T05:15:00Z', now)).toBe('45 min');
    expect(durationSince('2026-09-26T03:00:00Z', now)).toBe('3 h');
    expect(durationSince('2026-09-20T06:00:00Z', now)).toBe('6 days');
  });

  it('gives every unavailable reason a next step, never "no closures"', () => {
    for (const reason of ['not_permitted', 'stale', 'never_checked'] as const) {
      const message = unavailableMessage(report({ available: false, unavailableReason: reason }));
      expect(message.body).toMatch(/1364/);
      expect(`${message.title} ${message.body}`).not.toMatch(/no (road )?closures/i);
    }
  });

  it('counts closures for the summary tiles', () => {
    const counts = closureCounts(
      report({
        closures: [
          closure({ status: 'closed', roadType: 'NH' }),
          closure({ id: 2, status: 'partially_closed' }),
          closure({ id: 3, status: 'partially_opened', roadType: 'SH' }),
        ],
        recentlyReopened: [closure({ id: 4, status: 'open' })],
      })
    );
    expect(counts).toEqual({ closed: 2, partiallyOpen: 1, highways: 2, reopened: 1 });
  });
});
