import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFetchAnswer, mockFetchCatalogue, mockFetchMatch } = vi.hoisted(() => ({
  mockFetchAnswer: vi.fn(),
  mockFetchCatalogue: vi.fn(),
  mockFetchMatch: vi.fn(),
}));

vi.mock('../services', () => ({
  fetchAnswer: mockFetchAnswer,
  fetchCatalogue: mockFetchCatalogue,
  fetchMatch: mockFetchMatch,
  webRoute: (route: string) => route,
}));

import { AssistantPanel } from './assistant-panel';

const catalogue = {
  categories: [
    {
      id: 'weather',
      label: 'Weather & air',
      icon: 'cloud-sun',
      questions: [
        {
          id: 'weather.now',
          text: "What's the weather in {district} right now?",
          needs: 'district' as const,
        },
      ],
    },
  ],
  starters: ['weather.now'],
  districts: [{ slug: 'almora', name: 'Almora' }],
  places: [],
};

const answer = {
  questionId: 'weather.now',
  status: 'ok' as const,
  text: 'Almora is currently 18°C with clear skies.',
  facts: [
    {
      label: 'Temperature',
      value: '18°C',
      vintage: '2026-09-29T16:30:00.000Z',
      source: { department: 'Open-Meteo', url: 'https://open-meteo.com/' },
    },
  ],
  links: [{ label: 'View weather', route: '/hydromet' }],
  followUps: [],
};

describe('AssistantPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchCatalogue.mockResolvedValue(catalogue);
    mockFetchAnswer.mockResolvedValue(answer);
    mockFetchMatch.mockResolvedValue({
      outcome: 'matched',
      questionId: 'weather.now',
      district: 'almora',
      place: null,
      needs: 'district',
      suggestions: [],
    });
  });

  it('opens as an accessible dialog, traps focus, and restores focus when closed', async () => {
    render(<AssistantPanel />);

    const launcher = screen.getByRole('button', { name: 'Ask Pahad Pulse' });
    fireEvent.click(launcher);

    const dialog = await screen.findByRole('dialog', { name: 'Ask Pahad Pulse' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const input = screen.getByRole('textbox', { name: 'Type a question' });
    await waitFor(() => expect(input).toHaveFocus());

    const firstControl = screen.getByRole('link', { name: 'How answers work' });
    const lastControl = screen.getByRole('button', { name: 'Send' });
    lastControl.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(firstControl).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Ask Pahad Pulse' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ask Pahad Pulse' })).toHaveFocus();
    });
  });

  it('keeps typed wording visible and renders the matched sourced answer', async () => {
    render(<AssistantPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask Pahad Pulse' }));

    const input = await screen.findByRole('textbox', { name: 'Type a question' });
    fireEvent.change(input, { target: { value: 'Is it raining in Almora?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(
      await screen.findByText('Almora is currently 18°C with clear skies.')
    ).toBeInTheDocument();
    expect(screen.getAllByText('Is it raining in Almora?')).toHaveLength(1);
    expect(mockFetchMatch).toHaveBeenCalledWith('Is it raining in Almora?');
    expect(mockFetchAnswer).toHaveBeenCalledWith({
      questionId: 'weather.now',
      district: 'almora',
    });
    expect(screen.getByRole('link', { name: 'Open-Meteo' })).toHaveAttribute(
      'href',
      'https://open-meteo.com/'
    );
    expect(screen.getByRole('link', { name: /View weather/i })).toHaveAttribute(
      'href',
      '/hydromet'
    );
  });
});
