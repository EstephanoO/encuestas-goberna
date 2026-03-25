import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';

export interface VoteOptionRow {
  id: string;
  type: 'candidate' | 'blank' | 'undecided';
  candidate_id: string | null;
  label: string;
  slug: string;
  is_active: boolean;
  candidates?: {
    id: string;
    full_name: string;
    party_name: string;
    party_logo_url: string | null;
    candidate_photo_url: string | null;
  } | null;
}

@Injectable()
export class VoteOptionsRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async findActive(): Promise<VoteOptionRow[]> {
    const { data, error } = await this.supabase.db
      .from('vote_options')
      .select(
        `id, type, candidate_id, label, slug, is_active,
         candidates(id, full_name, party_name, party_logo_url, candidate_photo_url)`,
      )
      .eq('is_active', true)
      .order('type', { ascending: false }); // candidates first, then blank/undecided

    if (error) throw error;
    return data as unknown as VoteOptionRow[];
  }

  async findById(id: string): Promise<VoteOptionRow | null> {
    const { data, error } = await this.supabase.db
      .from('vote_options')
      .select('id, type, candidate_id, label, slug, is_active')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) return null;
    return data as VoteOptionRow;
  }

  async upsertCandidateOption(candidateId: string, label: string, slug: string) {
    const { error } = await this.supabase.db
      .from('vote_options')
      .upsert(
        {
          type: 'candidate',
          candidate_id: candidateId,
          label,
          slug,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slug' },
      );

    if (error) throw error;
  }

  async deactivateCandidateOptions() {
    const { error } = await this.supabase.db
      .from('vote_options')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('type', 'candidate');

    if (error) throw error;
  }
}
