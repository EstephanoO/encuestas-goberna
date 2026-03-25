import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { APP_CONSTANTS } from '../../common/constants/app.constants';

@Injectable()
export class ResultsRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async incrementAggregate(voteOptionId: string) {
    // Use RPC to atomically increment
    const { error } = await this.supabase.db.rpc('increment_vote', {
      p_vote_option_id: voteOptionId,
    });

    if (error) {
      // Fallback: manual upsert if RPC doesn't exist
      await this.manualIncrement(voteOptionId);
    }
  }

  private async manualIncrement(voteOptionId: string) {
    const { data: existing } = await this.supabase.db
      .from('results_aggregate')
      .select('total_votes')
      .eq('vote_option_id', voteOptionId)
      .single();

    const newCount = ((existing as { total_votes: number } | null)?.total_votes ?? 0) + 1;

    const { data: total } = await this.supabase.db
      .from('results_aggregate')
      .select('total_votes')
      .not('vote_option_id', 'is', null);

    const grandTotal =
      ((total as { total_votes: number }[] | null)?.reduce(
        (acc, r) => acc + r.total_votes,
        0,
      ) ?? 0) + 1;

    const percentage = grandTotal > 0 ? (newCount / grandTotal) * 100 : 0;

    await this.supabase.db.from('results_aggregate').upsert(
      {
        vote_option_id: voteOptionId,
        total_votes: newCount,
        percentage: Math.round(percentage * 10000) / 10000,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'vote_option_id' },
    );
  }

  async getAggregates() {
    const { data, error } = await this.supabase.db
      .from('results_aggregate')
      .select(
        `vote_option_id, total_votes, percentage, updated_at,
         vote_options(id, label, slug, type)`,
      )
      .order('total_votes', { ascending: false });

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data as unknown as Array<{
      vote_option_id: string;
      total_votes: number;
      percentage: number;
      updated_at: string;
      vote_options: { id: string; label: string; slug: string; type: string };
    }>;
  }

  async getMapPoints(limit = APP_CONSTANTS.MAP_POINTS_LIMIT) {
    const { data, error } = await this.supabase.db
      .from('survey_responses')
      .select(
        'id, latitude, longitude, created_at, vote_options(label)',
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data as unknown as Array<{
      id: string;
      latitude: number;
      longitude: number;
      created_at: string;
      vote_options: { label: string } | null;
    }>;
  }

  async getRecent(limit = APP_CONSTANTS.RECENT_RESPONSES_LIMIT) {
    const { data, error } = await this.supabase.db
      .from('survey_responses')
      .select('id, created_at, vote_options(label)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data as unknown as Array<{
      id: string;
      created_at: string;
      vote_options: { label: string } | null;
    }>;
  }

  async getTotalVotes(): Promise<number> {
    const { count, error } = await this.supabase.db
      .from('survey_responses')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count ?? 0;
  }
}
