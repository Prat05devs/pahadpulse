import { fireEvent, renderWithProviders, waitFor } from '@/test/utils';

import type { Answer, Catalogue } from '../schemas';
import * as services from '../services';
import { AssistantScreen } from './assistant-screen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('../services', () => {
  const actual = jest.requireActual('../services');
  return {
    ...actual,
    fetchCatalogue: jest.fn(),
    fetchAnswer: jest.fn(),
    fetchMatch: jest.fn(),
  };
});

const catalogue: Catalogue = {
  categories: [
    {
      id: 'safety',
      label: 'Safety',
      icon: 'shield',
      questions: [{ id: 'alerts.active', text: 'Are there active warnings?', needs: null }],
    },
  ],
  starters: ['alerts.active'],
  districts: [],
  places: [],
};

const answer: Answer = {
  questionId: 'alerts.active',
  status: 'ok',
  text: 'There are no active severe warnings.',
  facts: [],
  links: [{ label: 'See alerts', route: '/alerts' }],
  followUps: [],
};

const fetchCatalogue = services.fetchCatalogue as jest.MockedFunction<
  typeof services.fetchCatalogue
>;
const fetchAnswer = services.fetchAnswer as jest.MockedFunction<typeof services.fetchAnswer>;
const fetchMatch = services.fetchMatch as jest.MockedFunction<typeof services.fetchMatch>;

describe('AssistantScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchCatalogue.mockResolvedValue(catalogue);
    fetchAnswer.mockResolvedValue(answer);
  });

  it('loads a catalogue question and opens only a validated app route', async () => {
    const screen = await renderWithProviders(<AssistantScreen />);

    fireEvent.press(await screen.findByText('Are there active warnings?'));
    expect(await screen.findByText(answer.text)).toBeTruthy();

    expect(fetchAnswer).toHaveBeenCalledWith({ questionId: 'alerts.active', lang: 'en' });
    fireEvent.press(screen.getByLabelText('See alerts'));
    expect(mockPush).toHaveBeenCalledWith('/alerts');
  });

  it('keeps free-text wording and fetches its matched catalogue answer', async () => {
    fetchMatch.mockResolvedValue({
      outcome: 'matched',
      questionId: 'alerts.active',
      district: null,
      place: null,
      needs: null,
      suggestions: [],
    });
    const screen = await renderWithProviders(<AssistantScreen />);
    await screen.findByText('What would you like to know?');

    fireEvent.changeText(screen.getByLabelText('Type a question'), 'Anything urgent today?');
    await waitFor(() =>
      expect(screen.getByLabelText('Send question').props.accessibilityState.disabled).toBe(
        false
      )
    );
    fireEvent.press(screen.getByLabelText('Send question'));

    await waitFor(() =>
      expect(fetchMatch).toHaveBeenCalledWith('Anything urgent today?', 'en')
    );
    expect(screen.getByText('Anything urgent today?')).toBeTruthy();
    expect(await screen.findByText(answer.text)).toBeTruthy();
    expect(screen.queryAllByText('Are there active warnings?')).toHaveLength(1);
  });
});
