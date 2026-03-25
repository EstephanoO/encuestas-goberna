import { Controller, Get } from '@nestjs/common';
import { ResultsService } from './results.service';

@Controller('results')
export class ResultsController {
  constructor(private readonly service: ResultsService) {}

  @Get('summary')
  async getSummary() {
    const data = await this.service.getSummary();
    return { ok: true, data };
  }

  @Get('bars')
  async getBars() {
    const data = await this.service.getBars();
    return { ok: true, data };
  }

  @Get('map-points')
  async getMapPoints() {
    const data = await this.service.getMapPoints();
    return { ok: true, data };
  }

  @Get('recent')
  async getRecent() {
    const data = await this.service.getRecent();
    return { ok: true, data };
  }

  @Get('snapshot')
  async getSnapshot() {
    const data = await this.service.getSnapshot();
    return { ok: true, data };
  }
}
