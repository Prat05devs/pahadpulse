import { z } from 'zod';

export const DestinationSchema = z.object({
  id: z.number(),
  slug: z.string(),
  type: z.enum(['char_dham', 'hill_station', 'trek', 'wildlife', 'religious', 'other']),
  name: z.object({
    en: z.string(),
    hi: z.string(),
  }),
  areaId: z.number(),
  lat: z.number(),
  lng: z.number(),
  dailyCapacity: z.number(),
  capacitySourceId: z.number(),
});

export type Destination = z.infer<typeof DestinationSchema>;

export const VisitorCountSchema = z.object({
  destinationId: z.number(),
  countedOn: z.string().date(),
  count: z.number(),
  basis: z.enum(['registration', 'footfall', 'estimate']),
  sourceId: z.number(),
  fetchedAt: z.string().datetime(),
});

export type VisitorCount = z.infer<typeof VisitorCountSchema>;

export const DestinationWithLoadSchema = DestinationSchema.extend({
  latestCount: VisitorCountSchema.optional(),
  loadState: z.enum(['low', 'moderate', 'high', 'at_capacity', 'unknown']),
});

export type DestinationWithLoad = z.infer<typeof DestinationWithLoadSchema>;
