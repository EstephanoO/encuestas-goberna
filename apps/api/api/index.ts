import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { APP_CONSTANTS } from '../src/common/constants/app.constants';
import type { IncomingMessage, ServerResponse } from 'http';

let app: NestFastifyApplication;

async function bootstrap(): Promise<NestFastifyApplication> {
  if (app) return app;

  app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.setGlobalPrefix(APP_CONSTANTS.API_PREFIX);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.init();
  return app;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const nestApp = await bootstrap();
  const fastifyInstance = nestApp.getHttpAdapter().getInstance();
  fastifyInstance.server.emit('request', req, res);
}
