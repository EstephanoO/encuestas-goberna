import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { CandidatesService } from './candidates.service';

@Controller('candidates')
export class CandidatesController {
  constructor(private readonly service: CandidatesService) {}

  @Get()
  async getActive() {
    const data = await this.service.getActive();
    return { ok: true, data };
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async sync() {
    const count = await this.service.syncFromJne();
    return { ok: true, data: { synced: count } };
  }
}
