import { Injectable, Logger } from '@nestjs/common';
import { VotesRepository } from '../votes/votes.repository';
import { APP_CONSTANTS } from '../../common/constants/app.constants';

@Injectable()
export class AntiAbuseService {
  private readonly logger = new Logger(AntiAbuseService.name);

  constructor(private readonly votesRepo: VotesRepository) {}

  async check(ipHash: string, sessionId?: string): Promise<boolean> {
    const since = new Date(
      Date.now() - APP_CONSTANTS.ANTI_ABUSE_COOLDOWN_MS,
    );

    const ipCount = await this.votesRepo.countByIpHashSince(ipHash, since);
    if (ipCount > 0) {
      this.logger.warn(`Rate limited by IP hash: ${ipHash}`);
      return false;
    }

    if (sessionId) {
      const sessionCount = await this.votesRepo.countBySessionSince(
        sessionId,
        since,
      );
      if (sessionCount > 0) {
        this.logger.warn(`Rate limited by session: ${sessionId}`);
        return false;
      }
    }

    return true;
  }
}
