// Writes the catalog OpenAPI document without connecting to any database:
//   npm run build && npm run openapi   →   backend/openapi/catalog.json
import 'reflect-metadata';

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { AppSetup } from './app.setup.js';
import { ApiDocumentFactory } from './common/openapi/api-document.factory.js';
import { catalogEnvSchema } from './config/env.schema.js';

// Placeholders: preview mode never opens these connections.
const PREVIEW_ENV = {
  CATALOG_DATABASE_URL: 'mongodb://preview',
  REDIS_URL: 'redis://localhost',
  KAFKA_BROKERS: 'localhost:9094',
  STORAGE_ACCESS_KEY: 'preview',
  STORAGE_SECRET_KEY: 'preview',
  LOG_LEVEL: 'silent',
};

const exportDocument = async (outputPath: string): Promise<void> => {
  const env = catalogEnvSchema.parse({ ...PREVIEW_ENV });
  const app = await NestFactory.create(AppModule.forRoot(env), { preview: true, logger: false });
  AppSetup.configure(app);
  const document = ApiDocumentFactory.create(app);
  const target = resolve(outputPath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
  process.stdout.write(`OpenAPI written to ${target}\n`);
};

await exportDocument(process.argv[2] ?? '../../openapi/catalog.json');
