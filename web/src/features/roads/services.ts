import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { RoadWithStatusSchema } from './schemas';

export async function fetchRoadClosures() {
  return apiClient.get('/roads/closures', z.array(RoadWithStatusSchema));
}

export async function fetchRoadNetwork() {
  return apiClient.get('/roads', z.any());
}
