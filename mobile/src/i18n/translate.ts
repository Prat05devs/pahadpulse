import { useCallback } from 'react';

import { useLanguage } from '@/stores';
import type { Language } from '@/stores/preferences.store';

import { en } from './strings.en';
import { hi } from './strings.hi';

export type TranslationKey = keyof typeof en;

/** Values substituted into a string's `{placeholders}`. */
type Vars = Record<string, string | number>;

export type Translate = (key: TranslationKey, vars?: Vars) => string;

const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { en, hi };

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Look up one string.
 *
 * Exported for the few places that have a language but no React context — tests, and any
 * helper called outside a component. Inside a component, use `useT`.
 *
 * A key missing from Hindi cannot happen: `strings.hi.ts` is typed against the English keys,
 * so an untranslated string is a compile error rather than an English word appearing in a
 * Hindi screen.
 */
export function translate(language: Language, key: TranslationKey, vars?: Vars): string {
  const template = DICTIONARIES[language][key];
  if (!vars) return template;
  return template.replace(PLACEHOLDER, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

/**
 * The hook every component uses for its own words.
 *
 * Text that comes from the API is NOT translated here — it is localised with `localise()`
 * from the `en`/`hi` pair the server sends, because the platform never machine translates
 * published government text (ALR-2).
 */
export function useT(): Translate {
  const language = useLanguage();
  return useCallback(
    (key: TranslationKey, vars?: Vars) => translate(language, key, vars),
    [language]
  );
}
