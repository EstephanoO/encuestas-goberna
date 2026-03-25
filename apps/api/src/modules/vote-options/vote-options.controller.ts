import { Controller, Get } from '@nestjs/common';
import { VoteOptionsService } from './vote-options.service';

@Controller('vote-options')
export class VoteOptionsController {
  constructor(private readonly service: VoteOptionsService) {}

  @Get()
  async getActive() {
    const data = await this.service.getActive();
    return { ok: true, data };
  }
}
