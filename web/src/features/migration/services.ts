import { apiClient } from '@/lib/api';
import { AreaMigrationSchema, StateMigrationSchema } from './schemas';

/**
 * Every district's migration counts from both commission survey rounds.
 *
 * Returns all thirteen districts whether or not they have figures, so a page built from
 * this cannot quietly show twelve.
 */
export async function fetchStateMigration() {
  return apiClient.get('/migration', StateMigrationSchema);
}

/** One district's rounds, with the breakdowns explaining them. */
export async function fetchAreaMigration(slug: string) {
  return apiClient.get(`/areas/${slug}/migration`, AreaMigrationSchema);
}
