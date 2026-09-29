import type { Href } from 'expo-router';

import { apiClient, toQuery } from '@/lib/api';

import { AnswerSchema, CatalogueSchema, MatchSchema } from './schemas';

type Language = 'en' | 'hi';

export function fetchCatalogue(language: Language, signal?: AbortSignal) {
  return apiClient.get(`/assistant/catalogue${toQuery({ lang: language })}`, CatalogueSchema, {
    signal,
  });
}

export function fetchAnswer(
  input: { questionId: string; district?: string; place?: string; lang: Language },
  signal?: AbortSignal
) {
  return apiClient.post('/assistant/answer', input, AnswerSchema, { signal });
}

export function fetchMatch(text: string, language: Language, signal?: AbortSignal) {
  return apiClient.post('/assistant/match', { text, lang: language }, MatchSchema, { signal });
}

const ROUTES: Record<string, Href> = {
  '/': '/',
  '/alerts': '/alerts',
  '/map': '/map',
  '/seismic': '/seismic',
  '/air-quality': '/air-quality',
  '/roads': '/roads',
  '/trip-check': '/trip-check',
  '/connectivity': '/connectivity',
  '/tourism': '/tourism',
  '/districts': '/districts',
  '/governance': '/budget',
  '/sources': '/credits',
  '/compare': '/compare',
  '/schemes': '/schemes',
  '/data-explorer': '/data-explorer',
};

/** Accept only routes the app owns. API text can never turn into an arbitrary deep link. */
export function mobileRoute(route: string): Href | null {
  const exact = ROUTES[route];
  if (exact !== undefined) return exact;
  if (/^\/districts\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(route)) return route as Href;
  return null;
}

export function safeSourceUrl(url: string | null): string | null {
  return url !== null && /^https?:\/\//i.test(url) ? url : null;
}
