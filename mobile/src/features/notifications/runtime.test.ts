import { notificationAlertId, notificationFireDistrict } from './runtime';

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

describe('notificationFireDistrict', () => {
  it('accepts a district slug', () => {
    expect(notificationFireDistrict({ fireDistrict: 'pauri-garhwal', url: '/map' })).toBe(
      'pauri-garhwal'
    );
  });

  it('rejects anything that is not a plain slug', () => {
    for (const data of [
      null,
      {},
      { fireDistrict: '' },
      { fireDistrict: 7 },
      { fireDistrict: '../x' },
    ]) {
      expect(notificationFireDistrict(data)).toBeNull();
    }
  });
});
