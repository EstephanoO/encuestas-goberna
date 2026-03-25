import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './common/config/env.validation';
import { SupabaseModule } from './infrastructure/supabase/supabase.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { VoteOptionsModule } from './modules/vote-options/vote-options.module';
import { VotesModule } from './modules/votes/votes.module';
import { ResultsModule } from './modules/results/results.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { GeoModule } from './modules/geo/geo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 10,
      },
    ]),
    SupabaseModule,
    RedisModule,
    HealthModule,
    CandidatesModule,
    VoteOptionsModule,
    VotesModule,
    ResultsModule,
    RealtimeModule,
    GeoModule,
  ],
})
export class AppModule {}
