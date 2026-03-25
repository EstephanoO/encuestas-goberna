import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private pubClient: Redis;
  private subClient: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');

    this.pubClient = new Redis(url, {
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 1000)),
      lazyConnect: true,
      connectTimeout: 5000,
      enableOfflineQueue: false,
    });

    this.subClient = this.pubClient.duplicate();

    this.pubClient.on('connect', () =>
      this.logger.log('Redis pub client connected'),
    );
    this.pubClient.on('error', (err) =>
      this.logger.error('Redis pub error', err),
    );
    this.subClient.on('error', (err) =>
      this.logger.error('Redis sub error', err),
    );
  }

  async onModuleDestroy() {
    await this.pubClient.quit();
    await this.subClient.quit();
  }

  getPubClient(): Redis {
    return this.pubClient;
  }

  getSubClient(): Redis {
    return this.subClient;
  }
}
