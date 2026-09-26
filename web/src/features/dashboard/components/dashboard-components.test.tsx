import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LiveCounters } from './live-counters';
import { QuickAccessGrid } from './quick-access-grid';
import { DecisionToolsShowcase } from './decision-tools-showcase';
import { SourceStatusPanel } from './source-status-panel';

describe('dashboard overview components', () => {
  it('renders live metrics with human-readable context', () => {
    render(
      <LiveCounters
        data={{
          pilgrimArrivals: { value: 12500, year: 2025, destinationCount: 5 },
          activeAlerts: 3,
          connectivity: {
            mobileDownloadMbps: 150.6,
            districtsMeasured: 13,
            quarterStart: '2026-04-01',
          },
          budget: { total: 1_117_032_100, fiscalYear: '2026-27', yearsAvailable: 19 },
          indicatorCatalogue: { indicatorCount: 29, categoryCount: 10 },
          startupSchemes: { verifiedCount: 70, verifiedOn: '2026-07-22' },
          roadClosures: {
            available: false,
            unavailableReason: 'not_permitted',
            closed: 0,
            highways: 0,
            reopened: 0,
            checkedAt: null,
          },
        }}
      />
    );

    expect(screen.getByRole('heading', { name: 'State data snapshot' })).toBeInTheDocument();
    expect(screen.getByText('12,500')).toBeInTheDocument();
    expect(screen.getByText('150.6 Mbps')).toBeInTheDocument();
    expect(screen.getByText(/not people currently in the state/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pilgrim arrivals/i })).toHaveAttribute(
      'href',
      '/tourism'
    );
    // Not yet permitted: never a "0 closed" that reads as "every road is open".
    const roads = screen.getByRole('link', { name: /Road closures/i });
    expect(roads).toHaveTextContent('Coming soon');
    expect(roads).not.toHaveTextContent(/0 closed/);
  });

  it('uses links for dashboard navigation cards', () => {
    render(<QuickAccessGrid />);

    expect(screen.getByRole('link', { name: /Live alerts/i })).toHaveAttribute('href', '/alerts');
    expect(screen.getByRole('link', { name: /District details/i })).toHaveAttribute(
      'href',
      '/districts'
    );
    expect(screen.getByRole('link', { name: /Governance & budget/i })).toHaveAttribute(
      'href',
      '/governance'
    );
  });

  it('showcases decision tools with direct comparison entry points', () => {
    render(<DecisionToolsShowcase />);

    expect(
      screen.getByRole('heading', { name: /Move from published figures/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Compare two districts/i })).toHaveAttribute(
      'href',
      '/compare'
    );
    expect(screen.getAllByRole('link', { name: /business/i })[0]).toHaveAttribute(
      'href',
      '/compare#business'
    );
    expect(
      screen.getByRole('link', { name: /Discover support for a new enterprise/i })
    ).toHaveAttribute('href', '/compare#schemes');
  });

  it('shows a source as connected only when live status data is present', () => {
    render(
      <SourceStatusPanel
        status={{
          sourceKey: 'imd-cap-alerts',
          status: 'connected',
          itemCount: 10,
          latestPublishedAt: 'Thu, 03 Sep 2026 07:21:21 +0000',
          checkedAt: '2026-09-04T16:48:00.000Z',
          mayRedistribute: false,
          displayNotice:
            'Live feed connected. Alert content is held until redistribution rights are confirmed.',
        }}
      />
    );

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText(/responding with 10 current feed items/i)).toBeInTheDocument();
    expect(screen.getByText(/redistribution rights are confirmed/i)).toBeInTheDocument();
  });
});
