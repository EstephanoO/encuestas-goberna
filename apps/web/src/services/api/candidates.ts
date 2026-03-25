import { apiClient } from './client';
import type { Candidate } from '@encuesta/shared-types';

export async function fetchCandidates(): Promise<Candidate[]> {
  const { data } = await apiClient.get<{ ok: boolean; data: Candidate[] }>(
    '/candidates',
  );
  return data.data;
}
