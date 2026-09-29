import { notificationAlertId } from './runtime';

describe('notificationAlertId', () => {
  it('accepts positive numeric IDs from native notification data', () => {
    expect(notificationAlertId({ alertId: 42 })).toBe(42);
    expect(notificationAlertId({ alertId: '42' })).toBe(42);
  });

  it('rejects values that cannot be safe alert routes', () => {
    for (const data of [
      null,
      {},
      { alertId: 0 },
      { alertId: -1 },
      { alertId: 1.5 },
      { alertId: '1.5' },
      { alertId: 'alert-1' },
      { alertId: Number.MAX_SAFE_INTEGER + 1 },
    ]) {
      expect(notificationAlertId(data)).toBeNull();
    }
  });
});
