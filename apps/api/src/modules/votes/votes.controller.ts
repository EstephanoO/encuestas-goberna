import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VotesService } from './votes.service';
import { CreateVoteDto } from './dto/create-vote.dto';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FastifyRequest = any;
import { hashIp } from '../../common/utils/logger';

@Controller('votes')
export class VotesController {
  constructor(private readonly service: VotesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateVoteDto, @Req() req: FastifyRequest) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.ip ||
      'unknown';
    const ipHash = hashIp(ip);
    const userAgent = req.headers['user-agent'] ?? 'unknown';

    const data = await this.service.create(dto, ipHash, userAgent);
    return { ok: true, data };
  }
}
