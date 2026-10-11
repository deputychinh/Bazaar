import 'reflect-metadata';

import { AppConfigLoader, Environment } from '@bazaar/nest-common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { AppSetup } from './app.setup.js';
import { ApiDocumentFactory } from './common/openapi/api-document.factory.js';
import { orderEnvSchema } from './config/env.schema.js';
import { API_DOCS_PATH } from './constants/order.constant.js';

const bootstrap = async (): Promise<void> => {
  const env = AppConfigLoader.load(orderEnvSchema);
  const app = await NestFactory.create(AppModule.forRoot(env), { bufferLogs: true });
  app.useLogger(app.get(Logger));
  AppSetup.configure(app);
  if (env.NODE_ENV !== Environment.Production) {
    SwaggerModule.setup(API_DOCS_PATH, app, ApiDocumentFactory.create(app));
  }
  await app.listen(env.PORT);
};

await bootstrap();
