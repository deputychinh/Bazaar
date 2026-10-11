import { Test } from '@nestjs/testing';

import { AppConfig } from '../../config/app-config.js';
import { orderEnvSchema } from '../../config/env.schema.js';

import { ApiDocumentFactory } from './api-document.factory.js';

describe('ApiDocumentFactory', () => {
  it('describes the order API with bearer auth and problem details', async () => {
    const moduleRef = await Test.createTestingModule({}).compile();
    const app = moduleRef.createNestApplication();

    const document = ApiDocumentFactory.create(app);

    expect(document.info.title).toBe('Bazaar Order API');
    expect(document.components?.securitySchemes).toHaveProperty('bearer');
    expect(document.components?.schemas).toHaveProperty('ProblemDetails');
    await app.close();
  });
});

describe('AppConfig', () => {
  it('exposes the validated environment', () => {
    const env = orderEnvSchema.parse({
      ORDER_DATABASE_URL: 'mysql://u:p@localhost/bazaar_order',
      REDIS_URL: 'redis://localhost',
      KAFKA_BROKERS: 'localhost:9094',
    });
    expect(new AppConfig(env).env.PORT).toBe(4020);
  });
});
