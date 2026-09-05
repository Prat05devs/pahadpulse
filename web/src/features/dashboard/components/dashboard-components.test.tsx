import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LiveCounters } from './live-counters';
import { QuickAccessGrid } from './quick-access-grid';
import { SourceStatusPanel } from './source-status-panel';

describe('dashboard overview components', () => {
  it('renders live metrics with human-readable context', () => {
    render(
      <LiveCounters
        data={{
          touristsInState: 12500,
          activeAlerts: 3,
          closedRoads: 8,
          connectivityPercentage: 87,
        }}
      />
    );

    expect(screen.getByRole('heading', { name: 'Live state overview' })).toBeInTheDocument();
    expect(screen.getByText('12,500')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('uses links for dashboard navigation cards', () => {
    render(<QuickAccessGrid />);

    expect(screen.getByRole('link', { name: /Live alerts/i })).toHaveAttribute('href', '/alerts');
    expect(screen.getByRole('link', { name: /District details/i })).toHaveAttribute(
      'href',
      '/districts'
    );
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
