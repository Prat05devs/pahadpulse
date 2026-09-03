import type { Paginated } from '../types/pagination.js';

/**
 * The ONLY place `hasNext` is computed.
 *
 * Repositories select `limit + 1` rows; the extra row is the existence proof for the next page
 * and is discarded here. Never count.
 */
export function toPage<T extends { id: number }>(rows: T[], limit: number): Paginated<T> {
  const hasNext = rows.length > limit;
  const data = hasNext ? rows.slice(0, limit) : rows;
  const last = data.at(-1);
  return {
    data,
    pagination: {
      hasNext,
      nextCursor: hasNext && last !== undefined ? last.id : null,
    },
  };
}
