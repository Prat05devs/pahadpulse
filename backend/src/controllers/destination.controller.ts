import { err, ok, type Result } from 'neverthrow';

import { toAnnualVisitors, type DestinationVisitors } from '../models/destination.model.js';
import { DestinationRepository } from '../repositories/destination.repository.js';
import { attachProvenance, publiclyDisplayable } from '../services/provenance.service.js';
import type { RequestError } from '../utils/errors.js';

export interface PilgrimArrivals {
  destinations: DestinationVisitors[];
  /**
   * Per-year totals across the destinations actually served, so a headline cannot disagree
   * with the rows beneath it if DS-6 removes a source.
   */
  totals: Array<{ year: number; visitors: number }>;
  /** The years present, oldest first — what a caller needs to lay out columns. */
  years: number[];
}

/**
 * Published yearly pilgrim arrivals at the Char Dham shrines and Hemkund Sahib.
 *
 * These are annual totals, not live counts. Nothing here says how busy a shrine is today,
 * and the API deliberately exposes no load state for them: TOU-3 makes load `unknown` where
 * no capacity is published, and none is.
 */
export async function listPilgrimArrivals(
  now?: Date,
): Promise<Result<PilgrimArrivals, RequestError>> {
  const rows = await DestinationRepository.listAnnualVisitors();
  if (rows.isErr()) return err(rows.error);

  const stamped = await attachProvenance(rows.value.map(toAnnualVisitors), now);
  if (stamped.isErr()) return err(stamped.error);

  const byDestination = new Map<string, DestinationVisitors>();
  const totals = new Map<number, number>();

  rows.value.forEach((row, index) => {
    const figure = stamped.value[index];
    // DS-6: a figure whose source may not be redistributed is not served, and it must not
    // reach the totals either — otherwise the headline describes rows nobody can see.
    if (figure === undefined || publiclyDisplayable([figure]).length === 0) return;

    const existing = byDestination.get(row.slug) ?? {
      slug: row.slug,
      type: row.type,
      name: { en: row.name_en, hi: row.name_hi },
      district: {
        slug: row.area_slug,
        name: { en: row.area_name_en, hi: row.area_name_hi ?? row.area_name_en },
      },
      years: [],
    };
    existing.years.push(figure);
    byDestination.set(row.slug, existing);

    totals.set(row.year, (totals.get(row.year) ?? 0) + row.visitors);
  });

  const years = [...totals.keys()].sort((a, b) => a - b);

  return ok({
    destinations: [...byDestination.values()],
    totals: years.map((year) => ({ year, visitors: totals.get(year) ?? 0 })),
    years,
  });
}
