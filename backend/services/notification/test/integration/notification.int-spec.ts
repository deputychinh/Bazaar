import { EventFactory, EventType, Locale } from '@bazaar/contracts';
import { AppConfigLoader, EventProducer } from '@bazaar/nest-common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module.js';
import { AppSetup } from '../../src/app.setup.js';
import { notificationEnvSchema } from '../../src/config/env.schema.js';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service.js';

const runId = Date.now().toString(36);

const waitFor = async (condition: () => Promise<boolean>, timeoutMs = 30_000): Promise<void> => {
  const startedAt = Date.now();
  while (!(await condition())) {
    if (Date.now() - startedAt > timeoutMs)
      throw new Error(`condition not met within ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};

describe('Notification service (MongoDB + Kafka)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const env = AppConfigLoader.load(notificationEnvSchema);
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(env)],
    }).compile();
    app = moduleRef.createNestApplication();
    AppSetup.configure(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs a published event once and keeps the contact it carries', async () => {
    const userId = `it-user-${runId}`;
    const event = EventFactory.create({
      type: EventType.UserRegistered,
      aggregateId: userId,
      payload: { userId, email: `${userId}@bazaar.test`, preferredLocale: Locale.Vi },
    });
    const producer = app.get(EventProducer);
    await producer.publish(event);
    await producer.publish(event);

    await waitFor(
      async () => (await prisma.contact.findUnique({ where: { id: userId } })) !== null,
    );
    expect(await prisma.eventLogEntry.count({ where: { id: event.eventId } })).toBe(1);
  });
});
