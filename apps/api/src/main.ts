import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.setGlobalPrefix('v1');
  app.enableCors();
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(reflector),
  );

  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}/v1`);
}

bootstrap();
