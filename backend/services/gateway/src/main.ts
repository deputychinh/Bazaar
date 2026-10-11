import 'reflect-metadata';

import { AppConfigLoader, Environment } from '@bazaar/nest-common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { gatewayEnvSchema } from './config/env.schema.js';
import { API_DOCS_PATH, API_PREFIX } from './constants/gateway.constant.js';

const bootstrap = async (): Promise<void> => {
  const env = AppConfigLoader.load(gatewayEnvSchema);
  const app = await NestFactory.create(AppModule.forRoot(env), { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });
  app.setGlobalPrefix(API_PREFIX, {
    exclude: ['health/live', 'health/ready', '.well-known/jwks.json'],
  });
  app.enableShutdownHooks();
  if (env.NODE_ENV !== Environment.Production) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Bazaar API').setVersion('1').addBearerAuth().build(),
    );
    SwaggerModule.setup(API_DOCS_PATH, app, document);
  }
  await app.listen(env.PORT);
};

await bootstrap();
