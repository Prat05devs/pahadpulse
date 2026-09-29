import { apiClient } from '@/lib/api';

import { AnswerSchema, CatalogueSchema, MatchSchema } from './schemas';

export function fetchCatalogue() {
  return apiClient.get('/assistant/catalogue?lang=en', CatalogueSchema);
}

/** POST, as the API requires: questions stay out of URLs and logs (AST-7). */
export function fetchAnswer(input: { questionId: string; district?: string; place?: string }) {
  return apiClient.post('/assistant/answer', { ...input, lang: 'en' }, AnswerSchema);
}

export function fetchMatch(text: string) {
  return apiClient.post('/assistant/match', { text, lang: 'en' }, MatchSchema);
}

/**
 * The API returns app paths shared with mobile (assistant.md §5). A few have a different
 * home on the website; anything unknown falls back to the dashboard.
 */
const WEB_ROUTES: Record<string, string> = {
  '/map': '/',
  '/air-quality': '/hydromet',
  '/seismic': '/hydromet',
  '/schemes': '/compare#business',
  '/data-explorer': '/intelligence',
};

const WEB_PAGES = [
  '/',
  '/alerts',
  '/districts',
  '/roads',
  '/tourism',
  '/connectivity',
  '/governance',
  '/sources',
  '/compare',
  '/trip-check',
  '/hydromet',
  '/intelligence',
];

export function webRoute(route: string): string {
  const mapped = WEB_ROUTES[route] ?? route;
  if (mapped.startsWith('/districts/')) return mapped;
  const base = mapped.split('#')[0] ?? mapped;
  return WEB_PAGES.includes(base) ? mapped : '/';
}
