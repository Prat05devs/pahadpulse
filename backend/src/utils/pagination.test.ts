import { describe, expect, it } from '@jest/globals';

import { toPage } from './pagination.js';

describe('toPage', () => {
  it('reports hasNext false when the probe row is absent', () => {
    const page = toPage([{ id: 1 }, { id: 2 }], 5);
    expect(page.pagination.hasNext).toBe(false);
    expect(page.pagination.nextCursor).toBeNull();
    expect(page.data).toHaveLength(2);
  });

  it('drops the probe row and reports the cursor when a next page exists', () => {
    const page = toPage([{ id: 1 }, { id: 2 }, { id: 3 }], 2);
    expect(page.pagination.hasNext).toBe(true);
    expect(page.pagination.nextCursor).toBe(2);
    expect(page.data).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('handles an empty result', () => {
    const page = toPage([], 10);
    expect(page.data).toEqual([]);
    expect(page.pagination.hasNext).toBe(false);
    expect(page.pagination.nextCursor).toBeNull();
  });
});
