// Writes the gateway OpenAPI document to a file without connecting to any database:
//   npm run build && npm run openapi   →   backend/openapi/gateway.json
import 'reflect-metadata';

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { AppSetup } from './app.setup.js';
import { ApiDocumentFactory } from './common/openapi/api-document.factory.js';
import { gatewayEnvSchema } from './config/env.schema.js';

// Placeholders: preview mode never opens these connections.
const PREVIEW_ENV = {
  IDENTITY_DATABASE_URL: 'mysql://preview@localhost/preview',
  REDIS_URL: 'redis://localhost',
  KAFKA_BROKERS: 'localhost:9094',
  LOG_LEVEL: 'silent',
};

const exportDocument = async (outputPath: string): Promise<void> => {
  const env = gatewayEnvSchema.parse({ ...PREVIEW_ENV });
  const app = await NestFactory.create(AppModule.forRoot(env), { preview: true, logger: false });
  AppSetup.configure(app, env);
  const document = ApiDocumentFactory.create(app);
  const target = resolve(outputPath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
  process.stdout.write(`OpenAPI written to ${target}\n`);
};

await exportDocument(process.argv[2] ?? '../../openapi/gateway.json');
