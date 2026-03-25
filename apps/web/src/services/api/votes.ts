import type { CreateVoteRequest, CreateVoteResponse, VoteOption } from '@encuesta/shared-types';
import { STATIC_VOTE_OPTIONS } from '@/data/voteOptions';
import { supabase } from '../supabase';
import { hasVotedLocally, markVotedLocally, isAdmin } from '@/lib/fingerprint';

export async function fetchVoteOptions(): Promise<VoteOption[]> {
  return STATIC_VOTE_OPTIONS;
}

export async function submitVote(
  payload: CreateVoteRequest,
): Promise<CreateVoteResponse> {
  const admin = isAdmin();

  if (!admin && hasVotedLocally()) {
    throw new Error('Ya registraste tu voto. Solo se permite un voto por dispositivo.');
  }

  // Upsert into results_aggregate
  const { data: existing } = await supabase
    .from('results_aggregate')
    .select('total_votes')
    .eq('vote_option_id', payload.voteOptionId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('results_aggregate')
      .update({
        total_votes: existing.total_votes + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('vote_option_id', payload.voteOptionId);

    if (error) throw new Error(`Error al registrar voto: ${error.message}`);
  } else {
    const { error } = await supabase
      .from('results_aggregate')
      .insert({
        vote_option_id: payload.voteOptionId,
        total_votes: 1,
        updated_at: new Date().toISOString(),
      });

    if (error) throw new Error(`Error al registrar voto: ${error.message}`);
  }

  // Recalculate percentages
  const { data: all } = await supabase
    .from('results_aggregate')
    .select('vote_option_id, total_votes');

  const grandTotal = all?.reduce((sum, r) => sum + r.total_votes, 0) ?? 0;
  if (grandTotal > 0 && all) {
    for (const row of all) {
      const pct = Number(((row.total_votes / grandTotal) * 100).toFixed(4));
      await supabase
        .from('results_aggregate')
        .update({ percentage: pct })
        .eq('vote_option_id', row.vote_option_id);
    }
  }

  markVotedLocally();

  return {
    ok: true,
    data: { id: payload.voteOptionId, createdAt: new Date().toISOString() },
  };
}
