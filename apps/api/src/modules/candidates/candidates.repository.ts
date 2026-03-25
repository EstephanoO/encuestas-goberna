import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import {
  CandidateRow,
  rowToDto,
  scrapedToUpsertPayload,
} from './mappers/candidate.mapper';
import type { ScrapedCandidate } from './scrapers/jne-candidates.scraper';

@Injectable()
export class CandidatesRepository {
  private readonly logger = new Logger(CandidatesRepository.name);

  constructor(private readonly supabase: SupabaseService) {}

  async findActive() {
    const { data, error } = await this.supabase.db
      .from('candidates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true, nullsFirst: false });

    if (error) throw error;
    return (data as CandidateRow[]).map(rowToDto);
  }

  async upsertFromScrape(candidates: ScrapedCandidate[]) {
    const existing = await this.findAllRaw();
    const existingMap = new Map(
      existing.map((r) => [
        `${r.external_source}:${r.external_id ?? r.full_name}`,
        r.id,
      ]),
    );

    const payloads = candidates.map((c) => {
      const key = `jne:${c.externalId ?? c.fullName}`;
      return scrapedToUpsertPayload(c, existingMap.get(key));
    });

    const { error } = await this.supabase.db
      .from('candidates')
      .upsert(payloads, { onConflict: 'external_source,external_id' });

    if (error) throw error;
    this.logger.log(`Upserted ${payloads.length} candidates`);

    return payloads.length;
  }

  async deactivateNotIn(activeIds: string[]) {
    if (activeIds.length === 0) return;
    const { error } = await this.supabase.db
      .from('candidates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .not('id', 'in', `(${activeIds.join(',')})`);

    if (error) throw error;
  }

  private async findAllRaw(): Promise<CandidateRow[]> {
    const { data, error } = await this.supabase.db
      .from('candidates')
      .select('id, external_source, external_id, full_name');

    if (error) throw error;
    return data as CandidateRow[];
  }
}
