import { isAlertInForce } from './schemas';

describe('isAlertInForce', () => {
  const now = Date.parse('2026-09-13T06:00:00Z');

  it('keeps a current active warning', () => {
    expect(
      isAlertInForce({ status: 'active', expiresAt: '2026-09-13 07:00:00' }, now),
    ).toBe(true);
  });

  it('removes an expired warning saved in the offline cache', () => {
    expect(
      isAlertInForce({ status: 'active', expiresAt: '2026-09-13 05:59:59' }, now),
    ).toBe(false);
  });

  it('never presents a cancelled warning as active', () => {
    expect(isAlertInForce({ status: 'cancelled', expiresAt: null }, now)).toBe(false);
  });
});
