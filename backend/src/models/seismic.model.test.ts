import { describe, expect, it } from '@jest/globals';

import { classifyMagnitude, SeismicBand } from './seismic.model.js';

describe('classifyMagnitude', () => {
  it('uses the conventional magnitude classes', () => {
    expect(classifyMagnitude(2.4)).toBe(SeismicBand.Micro);
    expect(classifyMagnitude(3.5)).toBe(SeismicBand.Minor);
    expect(classifyMagnitude(4.3)).toBe(SeismicBand.Light);
    expect(classifyMagnitude(5.1)).toBe(SeismicBand.Moderate);
    expect(classifyMagnitude(6.2)).toBe(SeismicBand.Strong);
    expect(classifyMagnitude(7.8)).toBe(SeismicBand.Major);
  });

  it('places each boundary in the higher band', () => {
    expect(classifyMagnitude(3)).toBe(SeismicBand.Minor);
    expect(classifyMagnitude(4)).toBe(SeismicBand.Light);
    expect(classifyMagnitude(5)).toBe(SeismicBand.Moderate);
    expect(classifyMagnitude(7)).toBe(SeismicBand.Major);
  });

  it('classifies the two events actually recorded in Uttarakhand this quarter', () => {
    // M5.1 near Joshimath and M4.3 near Barkot — the live feed's own values.
    expect(classifyMagnitude(5.1)).toBe(SeismicBand.Moderate);
    expect(classifyMagnitude(4.3)).toBe(SeismicBand.Light);
  });
});
