import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { CandidatesRepository } from './candidates.repository';
import { JneCandidatesScraper } from './scrapers/jne-candidates.scraper';
import { VoteOptionsService } from '../vote-options/vote-options.service';

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    private readonly repo: CandidatesRepository,
    private readonly scraper: JneCandidatesScraper,
    private readonly supabase: SupabaseService,
    private readonly voteOptionsService: VoteOptionsService,
  ) {}

  async getActive() {
    return this.repo.findActive();
  }

  async syncFromJne(): Promise<number> {
    const syncRunId = await this.startSyncRun();

    try {
      const scraped = await this.scraper.scrape();

      if (scraped.length === 0) {
        this.logger.warn('Scraper returned 0 candidates — keeping existing data');
        await this.finishSyncRun(syncRunId, 'skipped', {
          reason: 'no candidates scraped',
        });
        return 0;
      }

      const count = await this.repo.upsertFromScrape(scraped);
      await this.voteOptionsService.rebuildCandidateOptions();

      await this.finishSyncRun(syncRunId, 'success', { count });
      return count;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('JNE sync failed', msg);
      await this.finishSyncRun(syncRunId, 'error', { error: msg });
      throw error;
    }
  }

  private async startSyncRun(): Promise<string> {
    const { data, error } = await this.supabase.db
      .from('sync_runs')
      .insert({
        source_name: 'jne',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;
    return (data as { id: string }).id;
  }

  private async finishSyncRun(
    id: string,
    status: string,
    metadata: Record<string, unknown>,
  ) {
    await this.supabase.db
      .from('sync_runs')
      .update({
        status,
        finished_at: new Date().toISOString(),
        metadata_json: metadata,
      })
      .eq('id', id);
  }
}
