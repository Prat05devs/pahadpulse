import { shouldStackCardGrid } from './layout';

describe('shouldStackCardGrid', () => {
  it('keeps two columns on a standard phone at the default text scale', () => {
    expect(shouldStackCardGrid(390, 1)).toBe(false);
  });

  it('stacks cards on a compact Android or split-screen window', () => {
    expect(shouldStackCardGrid(359, 1)).toBe(true);
  });

  it('stacks cards when the user enables large accessibility text', () => {
    expect(shouldStackCardGrid(412, 1.3)).toBe(true);
  });
});
