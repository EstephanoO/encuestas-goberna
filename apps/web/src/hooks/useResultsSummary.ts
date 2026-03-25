import { useQuery } from '@tanstack/react-query';
import { fetchResultsSnapshot } from '@/services/api/results';

export function useResultsSummary() {
  return useQuery({
    queryKey: ['results-snapshot'],
    queryFn: fetchResultsSnapshot,
    refetchOnWindowFocus: true,
    refetchInterval: 5_000,
    staleTime: 0,
  });
}
