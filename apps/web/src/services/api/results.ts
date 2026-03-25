import type { ResultsSnapshot, ResultsBarItem } from '@encuesta/shared-types';
import { supabase } from '../supabase';
import { STATIC_VOTE_OPTIONS } from '@/data/voteOptions';

const labelMap = new Map(STATIC_VOTE_OPTIONS.map((o) => [o.id, o.label]));

export async function fetchResultsSnapshot(): Promise<ResultsSnapshot> {
  const { data, error } = await supabase
    .from('results_aggregate')
    .select('vote_option_id, total_votes, percentage, updated_at')
    .order('total_votes', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = data ?? [];

  const bars: ResultsBarItem[] = rows.map((row) => ({
    voteOptionId: row.vote_option_id,
    label: labelMap.get(row.vote_option_id) ?? row.vote_option_id,
    totalVotes: row.total_votes,
    percentage: row.percentage,
  }));

  const totalVotes = bars.reduce((sum, b) => sum + b.totalVotes, 0);
  const leader = bars[0]
    ? { label: bars[0].label, totalVotes: bars[0].totalVotes, percentage: bars[0].percentage }
    : null;
  const updatedAt = rows[0]?.updated_at ?? new Date().toISOString();

  return {
    summary: { totalVotes, leader, updatedAt },
    bars,
    mapPoints: [],
    recent: [],
  };
}
