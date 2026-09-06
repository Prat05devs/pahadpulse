import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StateOverviewCard } from './state-overview-card';
import type { StateFigure, StateOverview } from '../types';

function figure(value: number | null, vintage: string | null, source: string | null): StateFigure {
  return { value, vintage, sourceLabel: source };
}

const census = 'Office of the Registrar General & Census Commissioner, India';
const fsi = 'Forest Survey of India, Ministry of Environment, Forest and Climate Change';

const overview: StateOverview = {
  population: figure(10086292, '2011-03-01', census),
  areaKmSq: figure(53483, '2011-03-01', census),
  literacy: figure(78.82, '2011-03-01', census),
  districts: figure(13, null, 'Pahad Pulse geography module'),
  forestCoverage: figure(45.44, '2019-01-01', fsi),
  villages: figure(16793, '2011-03-01', census),
};

describe('StateOverviewCard', () => {
  it('renders the sourced figures', () => {
    render(<StateOverviewCard data={overview} />);

    expect(screen.getByText('10.1')).toBeInTheDocument();
    expect(screen.getByText('53,483')).toBeInTheDocument();
    expect(screen.getByText('78.82')).toBeInTheDocument();
    expect(screen.getByText('45.44')).toBeInTheDocument();
    expect(screen.getByText('16,793')).toBeInTheDocument();
  });

  /**
   * The two figures this panel used to hardcode. 16,817 villages matched no published
   * Census total, and 63% forest cover matched neither of FSI's two measures. Both are
   * asserted absent so a regression that reintroduces a literal fails here.
   */
  it('does not display the old unsourced literals', () => {
    render(<StateOverviewCard data={overview} />);

    expect(screen.queryByText('16,817')).not.toBeInTheDocument();
    expect(screen.queryByText('63')).not.toBeInTheDocument();
  });

  it('shows the year each figure describes', () => {
    render(<StateOverviewCard data={overview} />);

    // Census figures and the 2019 forest assessment must be distinguishable — undated,
    // side by side, they imply a currency neither claims.
    expect(screen.getAllByText('2011').length).toBeGreaterThan(0);
    expect(screen.getByText('2019')).toBeInTheDocument();
  });

  it('renders a dash for a figure with no published source, never a zero', () => {
    render(
      <StateOverviewCard
        data={{ ...overview, forestCoverage: figure(null, null, null) }}
      />
    );

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('45.44')).not.toBeInTheDocument();
  });

  it('counts districts from the data rather than printing a fixed 13', () => {
    render(<StateOverviewCard data={{ ...overview, districts: figure(14, null, 'geography') }} />);

    expect(screen.getByText('14 districts')).toBeInTheDocument();
    expect(screen.queryByText('13 districts')).not.toBeInTheDocument();
  });

  it('names the publishing bodies', () => {
    render(<StateOverviewCard data={overview} />);

    expect(screen.getByText(new RegExp(census.slice(0, 30)))).toBeInTheDocument();
    expect(screen.getByText(/Forest Survey of India/)).toBeInTheDocument();
  });

  it('renders when the API returned nothing at all', () => {
    const empty: StateOverview = {
      population: figure(null, null, null),
      areaKmSq: figure(null, null, null),
      literacy: figure(null, null, null),
      districts: figure(null, null, null),
      forestCoverage: figure(null, null, null),
      villages: figure(null, null, null),
    };

    render(<StateOverviewCard data={empty} />);

    expect(screen.getAllByText('—')).toHaveLength(6);
    // The badge falls back to the bare word when there is no count to show, so "Districts"
    // appears both there and as the tile's own label.
    expect(screen.getAllByText('Districts').length).toBeGreaterThan(0);
    expect(screen.queryByText(/\d+ districts/)).not.toBeInTheDocument();
  });
});
