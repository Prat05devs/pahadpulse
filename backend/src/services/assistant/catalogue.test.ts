import { describe, expect, it } from '@jest/globals';

import { CATEGORIES, findQuestion, QUESTIONS, STARTERS } from './catalogue.js';

const slotsIn = (template: string) => [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

describe('the assistant catalogue', () => {
  it('holds the 75 questions the design specifies, each id unique', () => {
    expect(QUESTIONS).toHaveLength(75);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });

  it('puts every question in a known category, and every category has questions', () => {
    const ids = new Set(CATEGORIES.map((c) => c.id));
    for (const question of QUESTIONS) expect(ids.has(question.category)).toBe(true);
    for (const category of CATEGORIES) {
      expect(QUESTIONS.some((q) => q.category === category.id)).toBe(true);
    }
  });

  it('writes every question and template in both languages', () => {
    for (const question of QUESTIONS) {
      for (const text of [
        question.text,
        question.templates.ok,
        question.templates.empty,
        question.templates.unavailable,
      ]) {
        if (text === undefined) continue;
        expect(text.en.trim()).not.toBe('');
        expect(text.hi.trim()).not.toBe('');
        // The same slots in both languages, or one language would show a gap the other fills.
        expect(new Set(slotsIn(text.hi))).toEqual(new Set(slotsIn(text.en)));
      }
    }
  });

  it('names {district} and {place} in the question exactly when it takes them', () => {
    for (const question of QUESTIONS) {
      for (const kind of ['district', 'place'] as const) {
        expect(question.text.en.includes(`{${kind}}`)).toBe(question.params.includes(kind));
        expect(question.text.hi.includes(`{${kind}}`)).toBe(question.params.includes(kind));
      }
    }
  });

  /** AST-1: every number an answer states comes from a resolver, never from a template. */
  it('keeps figures out of templates, apart from fixed time windows in their wording', () => {
    for (const question of QUESTIONS) {
      const templates = [
        question.templates.ok,
        question.templates.empty,
        question.templates.unavailable,
      ];
      for (const template of templates) {
        if (template === undefined) continue;
        const withoutWindows = template.en
          .replace(/\b(48 hours|30 days|112|7 and over|Census 2011)\b/g, '')
          .replace(/\{\w+\}/g, '');
        expect(withoutWindows).not.toMatch(/\d/);
      }
    }
  });

  it('points every follow-up and starter at a question that exists', () => {
    for (const question of QUESTIONS) {
      expect(question.followUps.length).toBeGreaterThan(0);
      for (const id of question.followUps) expect(findQuestion(id)).toBeDefined();
    }
    expect(STARTERS).toHaveLength(6);
    for (const id of STARTERS) expect(findQuestion(id)).toBeDefined();
  });

  it('gives every question keywords for the free-text matcher', () => {
    for (const question of QUESTIONS) expect(question.keywords.length).toBeGreaterThan(0);
  });

  /** AST-8: nothing the reader sees claims to be AI. */
  it('never describes itself as AI', () => {
    for (const question of QUESTIONS) {
      const all = [
        question.text,
        question.templates.ok,
        question.templates.empty,
        question.templates.unavailable,
      ]
        .flatMap((t) => (t === undefined ? [] : [t.en, t.hi]))
        .join(' ');
      expect(all).not.toMatch(/\bAI\b|artificial intelligence|कृत्रिम बुद्धि/i);
    }
  });
});
