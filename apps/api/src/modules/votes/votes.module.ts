import { Module } from '@nestjs/common';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';
import { VotesRepository } from './votes.repository';
import { VoteOptionsModule } from '../vote-options/vote-options.module';
import { ResultsModule } from '../results/results.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AntiAbuseModule } from '../anti-abuse/anti-abuse.module';

@Module({
  imports: [VoteOptionsModule, ResultsModule, RealtimeModule, AntiAbuseModule],
  controllers: [VotesController],
  providers: [VotesService, VotesRepository],
})
export class VotesModule {}
