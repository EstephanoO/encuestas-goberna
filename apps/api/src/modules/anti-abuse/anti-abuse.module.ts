import { Module } from '@nestjs/common';
import { AntiAbuseService } from './anti-abuse.service';
import { VotesRepository } from '../votes/votes.repository';

@Module({
  providers: [AntiAbuseService, VotesRepository],
  exports: [AntiAbuseService],
})
export class AntiAbuseModule {}
