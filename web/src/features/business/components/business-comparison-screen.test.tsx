import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BusinessComparisonScreen } from './business-comparison-screen';

vi.mock('../hooks', () => ({
  useBusinessScenarios: () => ({
    data: [
      {
        id: 'homestay',
        name: 'Homestay',
        category: 'Tourism',
        description: 'A family-run guest house.',
        weights: {},
      },
    ],
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useBusinessComparison: () => ({ data: undefined, isLoading: false, error: null }),
}));

const districts = [
  { slug: 'almora', name: { en: 'Almora' } },
  { slug: 'chamoli', name: { en: 'Chamoli' } },
];

describe('BusinessComparisonScreen', () => {
  /**
   * The two districts are compared as equals. "Base location" and "Target location" implied
   * a move from one to the other, which the tool does not model. Wording on a public page
   * about the state is read closely, so the labels are pinned here.
   */
  it('labels both district pickers as equals, each linked to its control', () => {
    render(<BusinessComparisonScreen districts={districts} />);

    expect(screen.getByLabelText('2. First district')).toBeInstanceOf(HTMLSelectElement);
    expect(screen.getByLabelText('3. Second district')).toBeInstanceOf(HTMLSelectElement);
    expect(screen.queryByText(/base location|target location/i)).toBeNull();
  });

  it('asks about the business in plain words, matching the app', () => {
    render(<BusinessComparisonScreen districts={districts} />);

    expect(screen.getByLabelText('1. What business are you planning?')).toBeInstanceOf(
      HTMLSelectElement
    );
    expect(screen.queryByText(/venture|investment scenario/i)).toBeNull();
  });
});
