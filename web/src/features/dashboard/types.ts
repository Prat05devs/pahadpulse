import { z } from 'zod';

export const LiveCountersSchema = z.object({
  touristsInState: z.number(),
  activeAlerts: z.number(),
  closedRoads: z.number(),
  connectivityPercentage: z.number(),
});

export type LiveCounters = z.infer<typeof LiveCountersSchema>;

export const DistrictSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  nameHi: z.string(),
  population: z.number(),
  /** Which year the population figure describes, so the card can say so. */
  populationVintage: z.string().nullable(),
  activeAlerts: z.number(),
  slug: z.string(),
});

export type DistrictSummary = z.infer<typeof DistrictSummarySchema>;

/**
 * One figure on the state profile panel, with where it came from.
 *
 * `value` is nullable because a figure with no published source is a real state this panel
 * has to render. It previously could not: every field was a bare number, so the only way to
 * fill the panel was to hardcode one — which is how it came to display a village count and
 * a forest-cover percentage that matched no published figure at all.
 *
 * `vintage` and `sourceLabel` travel with the value so the panel can say which year each
 * number describes and who published it. Population from 2011 and forest cover from 2019
 * sitting side by side with no dates is the misleading part, not either number on its own.
 */
export const StateFigureSchema = z.object({
  value: z.number().nullable(),
  /** `YYYY-MM-DD` — what the figure describes, not when it was fetched. */
  vintage: z.string().nullable(),
  sourceLabel: z.string().nullable(),
});

export type StateFigure = z.infer<typeof StateFigureSchema>;

export const StateOverviewSchema = z.object({
  population: StateFigureSchema,
  areaKmSq: StateFigureSchema,
  literacy: StateFigureSchema,
  /** Counted from the geography module's own district list, so it cannot drift from it. */
  districts: StateFigureSchema,
  forestCoverage: StateFigureSchema,
  villages: StateFigureSchema,
});

export type StateOverview = z.infer<typeof StateOverviewSchema>;

export interface ImdCapLiveStatus {
  sourceKey: 'imd-cap-alerts';
  status: 'connected';
  itemCount: number;
  latestPublishedAt: string | null;
  checkedAt: string;
  mayRedistribute: false;
  displayNotice: string;
}
