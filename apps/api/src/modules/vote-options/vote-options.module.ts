import { Module, forwardRef } from '@nestjs/common';
import { VoteOptionsController } from './vote-options.controller';
import { VoteOptionsService } from './vote-options.service';
import { VoteOptionsRepository } from './vote-options.repository';
import { CandidatesModule } from '../candidates/candidates.module';

@Module({
  imports: [forwardRef(() => CandidatesModule)],
  controllers: [VoteOptionsController],
  providers: [VoteOptionsService, VoteOptionsRepository],
  exports: [VoteOptionsService, VoteOptionsRepository],
})
export class VoteOptionsModule {}
