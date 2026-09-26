import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TripCheckReport } from './trip-check-report';
import type { Destination } from '../model';

const destination: Destination = {
  kind: 'district',
  slug: 'chamoli',
  name: 'Chamoli',
  district: { slug: 'chamoli', name: 'Chamoli' },
};

const base = {
  destination,
  travelDate: '2026-09-26',
  travelDateLabel: 'Today · Sat, 26 Sept',
  isToday: true,
  checkedAt: new Date('2026-09-26T03:48:00Z'),
  weather: null,
  network: null,
  guide: null,
};

describe('TripCheckReport', () => {
  it('never turns a failed warnings request into "no warnings"', () => {
    render(<TripCheckReport {...base} alerts={null} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be loaded/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/does not mean there are none/i);
    expect(screen.queryByText(/No official warning is in force/i)).not.toBeInTheDocument();
  });

  it('states the absence of warnings for today without calling the trip safe', () => {
    render(<TripCheckReport {...base} alerts={[]} />);
    expect(
      screen.getByText('No official warning is in force for Chamoli district today.')
    ).toBeInTheDocument();
    expect(screen.getByText(/not a statement that the journey is safe/i)).toBeInTheDocument();
  });

  it('words a later date as "none issued so far"', () => {
    render(
      <TripCheckReport
        {...base}
        alerts={[]}
        isToday={false}
        travelDate="2026-09-29"
        travelDateLabel="Tue, 29 Sept"
      />
    );
    expect(
      screen.getByText(/No warning issued so far is valid for Chamoli district on this date/)
    ).toBeInTheDocument();
  });

  it('says so when road closures are not tracked, and still lists emergency help', () => {
    render(<TripCheckReport {...base} alerts={[]} />);
    expect(screen.getByText(/does not track road closures/i)).toBeInTheDocument();
    expect(screen.getByText('112')).toBeInTheDocument();
  });
});
