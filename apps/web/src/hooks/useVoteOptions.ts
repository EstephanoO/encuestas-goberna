import { useQuery } from '@tanstack/react-query';
import { fetchVoteOptions } from '@/services/api/votes';

export function useVoteOptions() {
  return useQuery({
    queryKey: ['vote-options'],
    queryFn: fetchVoteOptions,
    staleTime: 5 * 60 * 1000,
  });
}
