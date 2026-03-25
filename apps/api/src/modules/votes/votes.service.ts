import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CreateVoteDto } from './dto/create-vote.dto';
import { VotesRepository } from './votes.repository';
import { VoteOptionsService } from '../vote-options/vote-options.service';
import { ResultsService } from '../results/results.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AntiAbuseService } from '../anti-abuse/anti-abuse.service';

@Injectable()
export class VotesService {
  private readonly logger = new Logger(VotesService.name);

  constructor(
    private readonly repo: VotesRepository,
    private readonly voteOptionsService: VoteOptionsService,
    private readonly resultsService: ResultsService,
    private readonly realtimeService: RealtimeService,
    private readonly antiAbuseService: AntiAbuseService,
  ) {}

  async create(dto: CreateVoteDto, ipHash: string, userAgent: string) {
    // 1. Validate option exists and is active
    const option = await this.voteOptionsService.findById(dto.voteOptionId);
    if (!option) {
      throw new NotFoundException('Vote option not found or inactive');
    }

    // 2. Anti-abuse check
    const allowed = await this.antiAbuseService.check(
      ipHash,
      dto.sessionId,
    );
    if (!allowed) {
      throw new BadRequestException(
        'Por favor esperá un momento antes de votar nuevamente.',
      );
    }

    // 3. Persist
    const record = await this.repo.create(dto, ipHash, userAgent);

    // 4. Update aggregates
    await this.resultsService.incrementAggregate(dto.voteOptionId);

    // 5. Build and emit realtime events
    const snapshot = await this.resultsService.getSnapshot();

    this.realtimeService.emitVoteCreated({
      responseId: record.id,
      voteOptionId: dto.voteOptionId,
      createdAt: record.created_at,
    });

    this.realtimeService.emitResultsUpdated({
      totalVotes: snapshot.summary.totalVotes,
      bars: snapshot.bars,
      leader: snapshot.summary.leader,
      updatedAt: snapshot.summary.updatedAt,
    });

    this.realtimeService.emitMapPointCreated({
      id: record.id,
      latitude: dto.latitude,
      longitude: dto.longitude,
      label: option.label,
      createdAt: record.created_at,
    });

    return { id: record.id, createdAt: record.created_at };
  }
}
