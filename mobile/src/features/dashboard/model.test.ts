import {
  alertsForArea,
  districtSlugByName,
  highestSeverity,
  severityTone,
  urgentAlerts,
} from './model';

const NOW = Date.parse('2026-09-27T06:00:00Z');

function alert(
  overrides: Partial<{
    severity: 'minor' | 'moderate' | 'severe' | 'extreme' | 'unknown';
    status: 'active' | 'expired' | 'cancelled' | 'superseded';
    expiresAt: string | null;
    issuedAt: string;
    areas: { id: number; slug: string; name: { en: string; hi: string } }[];
  }> = {}
) {
  return {
    severity: 'moderate' as const,
    status: 'active' as const,
    expiresAt: null,
    issuedAt: '2026-09-27 05:00:00',
    areas: [],
    ...overrides,
  };
}

describe('highestSeverity', () => {
  it('returns null when nothing is in force', () => {
    expect(highestSeverity([], NOW)).toBeNull();
    expect(
      highestSeverity(
        [
          alert({ severity: 'extreme', status: 'expired' }),
          alert({ severity: 'severe', expiresAt: '2026-09-27 05:59:00' }),
        ],
        NOW
      )
    ).toBeNull();
  });

  it('picks the most severe warning still in force', () => {
    expect(
      highestSeverity(
        [
          alert({ severity: 'minor' }),
          alert({ severity: 'extreme', status: 'cancelled' }),
          alert({ severity: 'severe', expiresAt: '2026-09-28 00:00:00' }),
          alert({ severity: 'moderate' }),
        ],
        NOW
      )
    ).toBe('severe');
  });
});

describe('severityTone', () => {
  it('maps no warning to clear, severe and extreme to danger, the rest to caution', () => {
    expect(severityTone(null)).toBe('clear');
    expect(severityTone('extreme')).toBe('danger');
    expect(severityTone('severe')).toBe('danger');
    expect(severityTone('moderate')).toBe('caution');
    expect(severityTone('minor')).toBe('caution');
    expect(severityTone('unknown')).toBe('caution');
  });
});

describe('alertsForArea', () => {
  it('keeps only warnings that name the area', () => {
    const chamoli = { id: 1, slug: 'chamoli', name: { en: 'Chamoli', hi: 'चमोली' } };
    const almora = { id: 2, slug: 'almora', name: { en: 'Almora', hi: 'अल्मोड़ा' } };
    const list = [
      alert({ areas: [chamoli] }),
      alert({ areas: [almora] }),
      alert({ areas: [] }),
    ];
    expect(alertsForArea(list, 'chamoli')).toEqual([list[0]]);
  });
});

describe('urgentAlerts', () => {
  it('keeps severe and extreme warnings in force, most severe then newest first', () => {
    const olderSevere = alert({ severity: 'severe', issuedAt: '2026-09-26 10:00:00' });
    const newerSevere = alert({ severity: 'severe', issuedAt: '2026-09-27 04:00:00' });
    const extreme = alert({ severity: 'extreme', issuedAt: '2026-09-25 10:00:00' });
    const moderate = alert({ severity: 'moderate' });
    const expired = alert({ severity: 'extreme', status: 'expired' });

    expect(urgentAlerts([olderSevere, moderate, newerSevere, expired, extreme], NOW)).toEqual([
      extreme,
      newerSevere,
      olderSevere,
    ]);
  });
});

describe('districtSlugByName', () => {
  const districts = [
    { slug: 'rudraprayag', name: { en: 'Rudraprayag' } },
    { slug: 'uttarkashi', name: { en: 'Uttarkashi' } },
  ];

  it('matches the guide’s English district name regardless of case and spacing', () => {
    expect(districtSlugByName(districts, ' rudraprayag ')).toBe('rudraprayag');
  });

  it('returns null for a district the list does not have', () => {
    expect(districtSlugByName(districts, 'Chamoli')).toBeNull();
  });
});
