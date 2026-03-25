import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { CreateVoteDto } from './dto/create-vote.dto';

@Injectable()
export class VotesRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateVoteDto, ipHash: string, userAgent: string) {
    const { data, error } = await this.supabase.db
      .from('survey_responses')
      .insert({
        vote_option_id: dto.voteOptionId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy ?? null,
        permission_state: dto.permissionState,
        source: 'web',
        session_id: dto.sessionId ?? null,
        ip_hash: ipHash,
        user_agent: userAgent,
      })
      .select('id, created_at')
      .single();

    if (error) throw error;
    return data as { id: string; created_at: string };
  }

  async countByIpHashSince(ipHash: string, since: Date): Promise<number> {
    const { count, error } = await this.supabase.db
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since.toISOString());

    if (error) throw error;
    return count ?? 0;
  }

  async countBySessionSince(sessionId: string, since: Date): Promise<number> {
    const { count, error } = await this.supabase.db
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .gte('created_at', since.toISOString());

    if (error) throw error;
    return count ?? 0;
  }
}
