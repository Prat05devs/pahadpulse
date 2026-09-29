import { ok, type Result } from 'neverthrow';

import type { Provenance } from '../../models/source.model.js';
import { ERRORS, type RequestError } from '../../utils/errors.js';
import type { Fact, Localised, ResolvedFacts, UnavailableReason } from './types.js';

/** `en-IN` grouping (6,22,506) in both languages, as the dashboards print numbers. */
export function formatCount(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** `2011-03-01` or an ISO timestamp → `1 Mar 2011`, in IST. */
export function formatDay(value: string): string {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

/** An ISO timestamp → `4:30 pm, 29 Sep`, in IST. For live readings. */
export function formatMoment(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export function sourceOf(provenance: Provenance | null | undefined): Fact['source'] {
  if (provenance === null || provenance === undefined) return null;
  return { department: provenance.department, url: provenance.url };
}

export function same(text: string): Localised {
  return { en: text, hi: text };
}

/** Slots are allowed so a fallback can still name a helpline, which templates may not hard-code. */
export function unavailable(
  reason: UnavailableReason,
  slots: ResolvedFacts['slots'] = {},
): ResolvedFacts {
  return { status: 'unavailable', slots, facts: [], reason };
}

export function empty(slots: ResolvedFacts['slots'] = {}): ResolvedFacts {
  return { status: 'empty', slots, facts: [] };
}

/**
 * The errors that mean "we cannot say", as opposed to "the request was wrong".
 *
 * A controller refusing a non-redistributable source, or having nothing stored yet, is a
 * valid question with an honest answer (AST-3): it becomes `unavailable` inside a 200. Any
 * other error (a database failure) still propagates, so it is logged and seen.
 */
const UNAVAILABLE_CODES = new Map<number, UnavailableReason>([
  [ERRORS.SOURCE_NOT_REDISTRIBUTABLE.code, 'not_redistributable'],
  [ERRORS.SOURCE_NOT_FOUND.code, 'source_unavailable'],
  [ERRORS.OBSERVATION_NOT_AVAILABLE.code, 'no_data'],
  [ERRORS.AIR_QUALITY_NOT_AVAILABLE.code, 'no_data'],
  [ERRORS.STATION_NOT_FOUND.code, 'no_data'],
  [ERRORS.INDICATOR_VALUE_NOT_AVAILABLE.code, 'no_data'],
  [ERRORS.INDICATOR_NOT_FOUND.code, 'no_data'],
]);

export function asUnavailable(error: RequestError): Result<ResolvedFacts, RequestError> | null {
  const reason = UNAVAILABLE_CODES.get(error.code);
  return reason === undefined ? null : ok(unavailable(reason));
}
