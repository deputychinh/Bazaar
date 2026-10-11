import 'reflect-metadata';

import { AppConfigLoader, Environment } from '@bazaar/nest-common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { AppSetup } from './app.setup.js';
import { catalogEnvSchema } from './config/env.schema.js';
import { API_DOCS_PATH } from './constants/catalog.constant.js';

const bootstrap = async (): Promise<void> => {
  const env = AppConfigLoader.load(catalogEnvSchema);
  const app = await NestFactory.create(AppModule.forRoot(env), { bufferLogs: true });
  app.useLogger(app.get(Logger));
  AppSetup.configure(app);
  if (env.NODE_ENV !== Environment.Production) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Bazaar Catalog API').setVersion('1').addBearerAuth().build(),
    );
    SwaggerModule.setup(API_DOCS_PATH, app, document);
  }
  await app.listen(env.PORT);
};

await bootstrap();
