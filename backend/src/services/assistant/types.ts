import type { Result } from 'neverthrow';

import type { RequestError } from '../../utils/errors.js';

/**
 * Types for "Ask Pahad Pulse", the preset-question assistant. See
 * project/modules/assistant.md. Nothing here generates text: an answer is a written template
 * filled with figures that an existing controller returned.
 */

export type Lang = 'en' | 'hi';

export interface Localised {
  en: string;
  hi: string;
}

export type CategoryId =
  | 'safety'
  | 'weather'
  | 'travel'
  | 'tourism'
  | 'districts'
  | 'state'
  | 'connectivity'
  | 'budget'
  | 'tools'
  | 'data'
  | 'about';

export interface Category {
  id: CategoryId;
  label: Localised;
  /** An Ionicons / lucide-compatible name; each client maps it to its own icon set. */
  icon: string;
}

/** A question may take a district or a place from the official travel guide (§3). */
export type ParamKind = 'district' | 'place';

export interface DistrictRef {
  slug: string;
  name: Localised;
}

/**
 * One figure an answer rests on, rendered by the clients as a source card (AST-2). `source`
 * is null only for figures Pahad Pulse derives itself (a count of districts).
 */
export interface Fact {
  label: Localised;
  value: string;
  /** The date the figure describes, `YYYY-MM-DD` or ISO-8601. Null when it is a live count. */
  vintage: string | null;
  source: { department: Localised; url: string | null } | null;
}

export type PlaceKind = 'char_dham' | 'pilgrimage' | 'destination';

/** One place from the official travel guide (tourism-guide.json), placed in its district. */
export interface PlaceRef {
  slug: string;
  name: Localised;
  kind: PlaceKind;
  /** The guide's own category ("Panch Kedar", "Wildlife"); null for the Char Dham. */
  category: string | null;
  /** Null when the guide's district name matches none of the 13 (never expected). */
  district: DistrictRef | null;
  summary: string | null;
  altitudeM: number | null;
  bestSeason: string | null;
  access: string | null;
  officialUrl: string;
}

export type AnswerStatus = 'ok' | 'empty' | 'unavailable';

export type UnavailableReason = 'source_unavailable' | 'not_redistributable' | 'no_data';

/** A slot value: plain, or different per language (a district's Hindi name). */
export type SlotValue = string | number | Localised;

export interface ResolvedFacts {
  status: AnswerStatus;
  slots: Record<string, SlotValue>;
  facts: Fact[];
  reason?: UnavailableReason;
}

export interface ResolverParams {
  district?: DistrictRef;
  place?: PlaceRef;
}

export type Resolver = (
  params: ResolverParams,
  now: Date,
) => Promise<Result<ResolvedFacts, RequestError>>;

export interface AnswerTemplates {
  ok: Localised;
  /** A real "nothing to report" answer. Required wherever the resolver can return `empty`. */
  empty?: Localised;
  /** Overrides the generic wording when the question has a better fallback (roads → 1364). */
  unavailable?: Localised;
}

export type CacheClass = 'live' | 'daily' | 'reference';

export interface Question {
  id: string;
  category: CategoryId;
  /** `{district}` / `{place}` are replaced with the name in the reader's language. */
  text: Localised;
  params: readonly ParamKind[];
  /** Matcher input (§4.4). Lower case; Hindi in Devanagari and romanised both belong here. */
  keywords: readonly string[];
  resolver: Resolver;
  templates: AnswerTemplates;
  followUps: readonly string[];
  cacheClass: CacheClass;
  /** A path both clients know (§5), or null when there is no page to open. */
  route: (params: ResolverParams) => string | null;
}

export interface FollowUp {
  questionId: string;
  district: string | null;
  place: string | null;
  text: string;
}

export interface Answer {
  questionId: string;
  district: { slug: string; name: string } | null;
  place: { slug: string; name: string } | null;
  status: AnswerStatus;
  text: string;
  facts: Array<
    Omit<Fact, 'label' | 'source'> & {
      label: string;
      source: { department: string; url: string | null } | null;
    }
  >;
  links: Array<{ label: string; route: string }>;
  followUps: FollowUp[];
  generatedAt: string;
}
