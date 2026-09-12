import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardLayout } from './dashboard-layout';

const mockUsePathname = vi.fn(() => '/');

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('DashboardLayout', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
  });

  it('morphs the mobile menu icon while preserving an accessible toggle', () => {
    render(
      <DashboardLayout>
        <p>Dashboard content</p>
      </DashboardLayout>
    );

    const menuButton = screen.getByRole('button', { name: 'Open navigation' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(menuButton);

    expect(menuButton).toHaveAttribute('aria-label', 'Close navigation');
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('does not expose the retired migration route in navigation', () => {
    render(
      <DashboardLayout>
        <p>Dashboard content</p>
      </DashboardLayout>
    );

    expect(screen.queryByRole('link', { name: 'Migration' })).not.toBeInTheDocument();
  });
});
