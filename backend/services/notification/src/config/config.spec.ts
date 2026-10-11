import { Test } from '@nestjs/testing';

import { testConfig } from '../../test/fakes/notification.fakes.js';
import { ApiDocumentFactory } from '../common/openapi/api-document.factory.js';

import { notificationEnvSchema } from './env.schema.js';

describe('notification config', () => {
  it('applies the service defaults and refuses a non-Mongo URL', () => {
    expect(testConfig().env).toMatchObject({ SERVICE_NAME: 'notification', PORT: 4030 });
    expect(
      notificationEnvSchema.safeParse({
        NOTIFICATION_DATABASE_URL: 'mysql://x',
        REDIS_URL: 'redis://x',
        KAFKA_BROKERS: 'k:1',
      }).success,
    ).toBe(false);
  });

  it('describes the API with problem details', async () => {
    const app = (await Test.createTestingModule({}).compile()).createNestApplication();
    const document = ApiDocumentFactory.create(app);
    expect(document.info.title).toBe('Bazaar Notification API');
    expect(document.components?.schemas).toHaveProperty('ProblemDetails');
    await app.close();
  });
});
