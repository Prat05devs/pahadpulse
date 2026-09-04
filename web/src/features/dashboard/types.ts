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
  activeAlerts: z.number(),
  slug: z.string(),
});

export type DistrictSummary = z.infer<typeof DistrictSummarySchema>;

export const StateOverviewSchema = z.object({
  population: z.number(),
  areaKmSq: z.number(),
  literacy: z.number(),
  districts: z.number(),
  forestCoverage: z.number(),
  villages: z.number(),
});

export type StateOverview = z.infer<typeof StateOverviewSchema>;
