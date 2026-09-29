import type { Alert } from '@/features/alerts/schemas';
import { fireEvent, renderWithProviders } from '@/test/utils';

import { UrgentWarning } from './urgent-warning';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

function alert(overrides: Partial<Alert>): Alert {
  return {
    id: 1,
    sourceId: 1,
    sourceAlertId: 'imd-1',
    type: 'weather',
    severity: 'moderate',
    urgency: 'expected',
    certainty: 'likely',
    status: 'active',
    headline: 'Heavy rain likely in Chamoli',
    body: 'Isolated heavy to very heavy rainfall.',
    instruction: null,
    language: 'en',
    authority: 'IMD Dehradun',
    webUrl: null,
    geometry: null,
    centroid: null,
    issuedAt: '2026-09-27 04:00:00',
    effectiveFrom: null,
    expiresAt: null,
    fetchedAt: '2026-09-27 04:05:00',
    areas: [],
    provenance: {} as Alert['provenance'],
    ...overrides,
  };
}

describe('UrgentWarning', () => {
  beforeEach(() => mockPush.mockClear());

  it('stays hidden when no severe or extreme warning is in force', async () => {
    const screen = await renderWithProviders(
      <UrgentWarning
        alerts={[
          alert({ severity: 'moderate' }),
          alert({ id: 2, severity: 'extreme', status: 'expired' }),
        ]}
      />
    );

    expect(screen.queryByText('URGENT WARNING')).toBeNull();
  });

  it('raises the most severe warning, counts the rest and opens it', async () => {
    const screen = await renderWithProviders(
      <UrgentWarning
        alerts={[
          alert({ id: 3, severity: 'severe', headline: 'Landslide risk on NH-07' }),
          alert({ id: 4, severity: 'extreme', headline: 'Flash flood in Alaknanda basin' }),
        ]}
      />
    );

    expect(screen.getByText('URGENT WARNING')).toBeTruthy();
    expect(screen.getByText('Flash flood in Alaknanda basin')).toBeTruthy();
    expect(screen.getByText('+1 more severe warnings in force')).toBeTruthy();

    fireEvent.press(screen.getByLabelText(/Read the official warning/));
    expect(mockPush).toHaveBeenCalledWith('/alerts/4');
  });
});
