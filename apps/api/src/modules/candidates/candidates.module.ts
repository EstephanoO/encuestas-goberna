import { Module, forwardRef } from '@nestjs/common';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { CandidatesRepository } from './candidates.repository';
import { JneCandidatesScraper } from './scrapers/jne-candidates.scraper';
import { SyncJneCandidatesJob } from './jobs/sync-jne-candidates.job';
import { VoteOptionsModule } from '../vote-options/vote-options.module';

@Module({
  imports: [forwardRef(() => VoteOptionsModule)],
  controllers: [CandidatesController],
  providers: [
    CandidatesService,
    CandidatesRepository,
    JneCandidatesScraper,
    SyncJneCandidatesJob,
  ],
  exports: [CandidatesService],
})
export class CandidatesModule {}
