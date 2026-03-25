import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CandidatesService } from '../candidates.service';
import { APP_CONSTANTS } from '../../../common/constants/app.constants';

@Injectable()
export class SyncJneCandidatesJob {
  private readonly logger = new Logger(SyncJneCandidatesJob.name);

  constructor(private readonly candidatesService: CandidatesService) {}

  @Cron(APP_CONSTANTS.JNE_SYNC_CRON)
  async handle() {
    this.logger.log('Running scheduled JNE candidates sync...');
    try {
      const count = await this.candidatesService.syncFromJne();
      this.logger.log(`Sync complete. Processed ${count} candidates.`);
    } catch (error) {
      this.logger.error('Scheduled JNE sync failed', error);
    }
  }
}
