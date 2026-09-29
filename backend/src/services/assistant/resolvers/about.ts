import { err, ok } from 'neverthrow';

import * as sourceController from '../../../controllers/source.controller.js';
import { listBusinessSchemes } from '../../business-scheme.service.js';
import { formatCount, formatDay, same, unavailable } from '../format.js';
import type { Resolver } from '../types.js';

/**
 * Answers about Pahad Pulse itself: what it is, what its tools do, and where each kind of
 * data comes from. The product answers are fixed wording in the catalogue; the source answers
 * read the live registry, so they can never name a source that has since been removed.
 */

/** A question whose whole answer is its template: a fact about the product, not a figure. */
export const statement: Resolver = () =>
  Promise.resolve(ok({ status: 'ok', slots: {}, facts: [] }));

export const schemeFinder: Resolver = () => {
  const directory = listBusinessSchemes({ limit: 0 });
  return Promise.resolve(
    ok({
      status: 'ok',
      slots: {
        total: formatCount(directory.total),
        supportTypes: formatCount(directory.supportTypes.length),
        verified: formatDay(directory.verifiedOn),
      },
      facts: [
        {
          label: { en: 'Scheme directory verified', hi: 'योजना निर्देशिका सत्यापित' },
          value: formatDay(directory.verifiedOn),
          vintage: directory.verifiedOn,
          source: {
            department: same(new URL(directory.sourceUrl).hostname),
            url: directory.sourceUrl,
          },
        },
      ],
    }),
  );
};

/**
 * Where one module's figures come from, from the source registry. DS-6: a source we may not
 * republish is not listed as one we show.
 */
export function sourcesFor(ownerModule: string): Resolver {
  return async (_params, now) => {
    const sources = await sourceController.listSources(now);
    if (sources.isErr()) return err(sources.error);
    const shown = sources.value.filter((s) => s.ownerModule === ownerModule && s.mayRedistribute);
    if (shown.length === 0) return ok(unavailable('no_data'));

    return ok({
      status: 'ok',
      slots: {
        count: formatCount(shown.length),
        sources: {
          en: shown.map((s) => s.department.en).join('; '),
          hi: shown.map((s) => s.department.hi).join('; '),
        },
      },
      facts: shown.map((source) => ({
        label: { en: 'Source', hi: 'स्रोत' },
        value: source.attribution,
        vintage: source.lastVintage,
        source: { department: source.department, url: source.url },
      })),
    });
  };
}
