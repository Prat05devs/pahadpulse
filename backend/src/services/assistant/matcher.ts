import { QUESTIONS } from './catalogue.js';
import { findDistrict, normalise, type DistrictIndex } from './districts.js';
import { findPlace, type PlaceIndex } from './places.js';
import type { DistrictRef, PlaceRef, Question } from './types.js';

/**
 * Typed text → a catalogue question, by keyword scoring (§4.4). No model: this only ever
 * routes to a question that exists, and it never writes an answer from the reader's own
 * words (AST-5).
 */

const KEYWORD_WEIGHT = 3;
const DISTRICT_BONUS = 2;
/**
 * A direct answer needs one clear keyword and a lead over the runner-up. Keywords are kept
 * specific (multi-word where a single word is generic) so one hit is a real signal.
 */
const MATCH_SCORE = 3;
const MATCH_LEAD = 2;
/** Below this, nothing is close enough to suggest. */
const SUGGEST_SCORE = 3;
const SUGGESTIONS = 3;

export type MatchOutcome = 'matched' | 'suggest' | 'none';

export type ParamNeeded = 'district' | 'place' | null;

export interface MatchResult {
  outcome: MatchOutcome;
  questionId: string | null;
  district: DistrictRef | null;
  place: PlaceRef | null;
  /** What the matched question still needs because the text named none: the client asks. */
  needs: ParamNeeded;
  suggestions: string[];
}

/** A place named in the text is a stronger fit for a place question than a district bonus. */
const PLACE_BONUS = 3;

export function score(
  question: Question,
  text: string,
  named: { district: boolean; place: boolean },
): number {
  const padded = ` ${text} `;
  let total = 0;
  for (const keyword of question.keywords) {
    const phrase = normalise(keyword);
    // A matched phrase is stronger evidence than a word: "biggest earthquake" outranks the
    // bare "earthquake" another question also lists.
    if (padded.includes(` ${phrase} `)) total += KEYWORD_WEIGHT * phrase.split(' ').length;
  }
  if (total === 0) return 0;
  const takesDistrict = question.params.includes('district');
  const takesPlace = question.params.includes('place');
  if (takesDistrict && named.district) total += DISTRICT_BONUS;
  if (takesPlace && named.place) total += PLACE_BONUS;
  // A state-wide question is a slightly worse fit once the reader has named somewhere. A
  // question whose place or district was not named still scores: the client then asks.
  if (!takesDistrict && !takesPlace && (named.district || named.place)) total -= 1;
  // With no place named, "travel" means the district question: a district is the broader
  // and more common reading, and the client can still offer the place version.
  if (takesPlace && !named.place) total -= 2;
  return total;
}

function isOwnName(district: DistrictRef, matched: string): boolean {
  return [district.name.en, district.name.hi, district.slug.replace(/-/g, ' ')]
    .map(normalise)
    .includes(matched);
}

function without(text: string, phrase: string | undefined): string {
  return phrase === undefined ? text : ` ${text} `.replace(` ${phrase} `, ' ').trim();
}

export function match(districts: DistrictIndex, places: PlaceIndex, raw: string): MatchResult {
  const text = normalise(raw);
  let district = findDistrict(districts, text);
  let place = findPlace(places, text);

  // One word can name both: "Nainital" is a district and a lake town, "Kedarnath" a shrine
  // and (as an alias) its district. A district's own name means the district; an alias
  // that is also a guide place means the place.
  if (district !== null && place !== null && district.matched === place.matched) {
    if (isOwnName(district.district, district.matched)) place = null;
    else district = null;
  }

  // Names are removed before scoring, so "Kedarnath" as a place does not also score as a
  // tourism keyword.
  const rest = without(without(text, district?.matched), place?.matched);
  const named = { district: district !== null, place: place !== null };

  const ranked = QUESTIONS.map((question) => ({ question, score: score(question, rest, named) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const [top, second] = ranked;
  const suggestions = ranked
    .filter((entry) => entry.score >= SUGGEST_SCORE)
    .slice(0, SUGGESTIONS)
    .map((entry) => entry.question.id);

  // A district question after naming a place answers for that place's district.
  const effectiveDistrict = district?.district ?? place?.place.district ?? null;

  if (
    top !== undefined &&
    top.score >= MATCH_SCORE &&
    top.score - (second?.score ?? 0) >= MATCH_LEAD
  ) {
    const params = top.question.params;
    const needs: ParamNeeded =
      params.includes('place') && place === null
        ? 'place'
        : params.includes('district') && effectiveDistrict === null
          ? 'district'
          : null;
    return {
      outcome: 'matched',
      questionId: top.question.id,
      district: effectiveDistrict,
      place: place?.place ?? null,
      needs,
      suggestions,
    };
  }
  if (suggestions.length > 0) {
    return {
      outcome: 'suggest',
      questionId: null,
      district: effectiveDistrict,
      place: place?.place ?? null,
      needs: null,
      suggestions,
    };
  }
  return {
    outcome: 'none',
    questionId: null,
    district: null,
    place: null,
    needs: null,
    suggestions: [],
  };
}
