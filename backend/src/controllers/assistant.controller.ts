import { err, ok, type Result } from 'neverthrow';

import { CATEGORIES, findQuestion, QUESTIONS, STARTERS } from '../services/assistant/catalogue.js';
import { compose, questionText } from '../services/assistant/composer.js';
import { loadIndex } from '../services/assistant/districts.js';
import { match, type MatchOutcome, type ParamNeeded } from '../services/assistant/matcher.js';
import { buildPlaceIndex, type PlaceIndex } from '../services/assistant/places.js';
import type { Answer, CacheClass, Lang, ResolverParams } from '../services/assistant/types.js';
import { describeError } from '../utils/describe-error.js';
import { ERRORS, type RequestError } from '../utils/errors.js';
import createLogger from '../utils/logger.js';

const logger = createLogger('@assistant.controller');

/**
 * "Ask Pahad Pulse" (project/modules/assistant.md). Stateless: every request is one question,
 * carrying no identity and no transcript (AST-7).
 */

/** Built from the district index (a place is placed in its district), once per index. */
let placeCache: { districts: unknown; places: PlaceIndex } | null = null;

async function loadIndexes(now: Date = new Date()) {
  const districts = await loadIndex(now);
  if (districts.isErr()) return err(districts.error);
  if (placeCache?.districts !== districts.value) {
    placeCache = { districts: districts.value, places: buildPlaceIndex(districts.value) };
  }
  return ok({ districts: districts.value, places: placeCache.places });
}

export interface CatalogueOut {
  categories: Array<{
    id: string;
    label: string;
    icon: string;
    questions: Array<{ id: string; text: string; needs: ParamNeeded }>;
  }>;
  starters: string[];
  districts: Array<{ slug: string; name: string }>;
  places: Array<{ slug: string; name: string; kind: string; district: string | null }>;
}

function needsOf(params: readonly string[]): ParamNeeded {
  if (params.includes('place')) return 'place';
  if (params.includes('district')) return 'district';
  return null;
}

export async function getCatalogue(lang: Lang): Promise<Result<CatalogueOut, RequestError>> {
  const index = await loadIndexes();
  if (index.isErr()) return err(index.error);

  return ok({
    categories: CATEGORIES.map((category) => ({
      id: category.id,
      label: category.label[lang],
      icon: category.icon,
      questions: QUESTIONS.filter((q) => q.category === category.id).map((q) => ({
        id: q.id,
        // `{district}` / `{place}` are left in: the client fills them once the reader picks.
        text: q.text[lang],
        needs: needsOf(q.params),
      })),
    })),
    starters: [...STARTERS],
    districts: index.value.districts.districts.map((d) => ({ slug: d.slug, name: d.name[lang] })),
    places: index.value.places.places.map((p) => ({
      slug: p.slug,
      name: p.name[lang],
      kind: p.kind,
      district: p.district?.slug ?? null,
    })),
  });
}

/** How long an answer is reused, by how fast its data changes (§3.2). */
const TTL_MS: Record<CacheClass, number> = {
  live: 60 * 1000,
  daily: 15 * 60 * 1000,
  reference: 6 * 60 * 60 * 1000,
};

/** Bounded by the catalogue: questions × (districts + places + none) × 2 languages. */
const answers = new Map<string, { answer: Answer; expiresAt: number }>();

/** Test seam only. */
export function clearAnswerCache(): void {
  answers.clear();
}

export async function answer(
  input: {
    questionId: string;
    district?: string | undefined;
    place?: string | undefined;
    lang: Lang;
  },
  now: Date = new Date(),
): Promise<Result<Answer, RequestError>> {
  const question = findQuestion(input.questionId);
  if (question === undefined) return err(ERRORS.ASSISTANT_QUESTION_UNKNOWN);

  const needsDistrict = question.params.includes('district');
  const needsPlace = question.params.includes('place');
  if (needsDistrict && input.district === undefined) return err(ERRORS.ASSISTANT_PARAM_REQUIRED);
  if (needsPlace && input.place === undefined) return err(ERRORS.ASSISTANT_PARAM_REQUIRED);

  const params: ResolverParams = {};
  if (needsDistrict || needsPlace) {
    const index = await loadIndexes(now);
    if (index.isErr()) return err(index.error);
    if (needsDistrict) {
      const district = index.value.districts.districts.find((d) => d.slug === input.district);
      if (district === undefined) return err(ERRORS.ASSISTANT_DISTRICT_UNKNOWN);
      params.district = district;
    }
    if (needsPlace) {
      const place = index.value.places.places.find((p) => p.slug === input.place);
      if (place === undefined) return err(ERRORS.ASSISTANT_PLACE_UNKNOWN);
      params.place = place;
    }
  }

  const key = `${question.id}|${params.district?.slug ?? ''}|${params.place?.slug ?? ''}|${input.lang}`;
  const cached = answers.get(key);
  if (cached !== undefined && cached.expiresAt > now.getTime()) return ok(cached.answer);

  let resolved;
  try {
    resolved = await question.resolver(params, now);
  } catch (error) {
    // Resolvers return errors as values; a throw is a bug, and must not become a 500 page
    // in the middle of a chat.
    logger.error('resolver threw', { questionId: question.id, error: describeError(error) });
    return err(ERRORS.INTERNAL_SERVER_ERROR);
  }
  if (resolved.isErr()) return err(resolved.error);

  const composed = compose(question, resolved.value, input.lang, params, now);
  answers.set(key, { answer: composed, expiresAt: now.getTime() + TTL_MS[question.cacheClass] });
  return ok(composed);
}

export interface MatchOut {
  outcome: MatchOutcome;
  questionId: string | null;
  district: string | null;
  place: string | null;
  needs: ParamNeeded;
  suggestions: Array<{
    questionId: string;
    text: string;
    district: string | null;
    place: string | null;
    needs: ParamNeeded;
  }>;
}

export async function matchText(
  input: { text: string; lang: Lang },
  now: Date = new Date(),
): Promise<Result<MatchOut, RequestError>> {
  const index = await loadIndexes(now);
  if (index.isErr()) return err(index.error);

  const result = match(index.value.districts, index.value.places, input.text);
  // The outcome is logged so unanswered topics can be added (§4.4); the text never is (AST-7).
  logger.info('assistant match', { outcome: result.outcome, questionId: result.questionId });

  return ok({
    outcome: result.outcome,
    questionId: result.questionId,
    district: result.district?.slug ?? null,
    place: result.place?.slug ?? null,
    needs: result.needs,
    suggestions: result.suggestions.flatMap((id) => {
      const question = findQuestion(id);
      if (question === undefined) return [];
      // Fill in whatever the text named; anything still missing the client asks for.
      const carry: ResolverParams = {};
      if (question.params.includes('district') && result.district !== null)
        carry.district = result.district;
      if (question.params.includes('place') && result.place !== null) carry.place = result.place;
      const missing = question.params.filter((p) => !(p in carry));
      return [
        {
          questionId: id,
          text: questionText(question, input.lang, carry),
          district: carry.district?.slug ?? null,
          place: carry.place?.slug ?? null,
          needs: needsOf(missing),
        },
      ];
    }),
  });
}
