import { EventFactory, EventType, Locale } from '@bazaar/contracts';

import {
  InMemoryContactsRepository,
  InMemoryEventLogRepository,
  OnceProcessedEventStore,
} from '../../../test/fakes/notification.fakes.js';
import { ContactsReaction } from '../contacts/services/contacts.reaction.js';
import { EventLogReaction } from '../event-log/services/event-log.reaction.js';

import { PipelineHandler } from './pipeline.handler.js';
import type { PrismaProcessedEventStore } from './prisma-processed-event.store.js';

describe('PipelineHandler', () => {
  const setup = () => {
    const log = new InMemoryEventLogRepository();
    const contacts = new InMemoryContactsRepository();
    const store = new OnceProcessedEventStore() as unknown as PrismaProcessedEventStore;
    const reactions = { all: [new EventLogReaction(log), new ContactsReaction(contacts)] };
    return { log, contacts, store, reactions };
  };

  it('logs every event and keeps contacts from identity events — once per event id', async () => {
    const { log, contacts, store, reactions } = setup();
    const handler = new PipelineHandler(EventType.UserRegistered, store, reactions);
    const event = EventFactory.create({
      type: EventType.UserRegistered,
      aggregateId: 'u1',
      payload: { userId: 'u1', email: 'linh@bazaar.test', preferredLocale: Locale.Vi },
    });

    await handler.handle(event);
    await handler.handle(event);

    expect(log.entries).toEqual([
      expect.objectContaining({
        eventId: event.eventId,
        type: EventType.UserRegistered,
        topic: 'identity.events',
        aggregateId: 'u1',
      }),
    ]);
    expect(contacts.rows.get('u1')).toEqual({
      userId: 'u1',
      email: 'linh@bazaar.test',
      preferredLocale: Locale.Vi,
    });
  });

  it('updates the contact from reset requests and ignores other events for contacts', async () => {
    const { log, contacts, store, reactions } = setup();
    await new PipelineHandler(EventType.PasswordResetRequested, store, reactions).handle(
      EventFactory.create({
        type: EventType.PasswordResetRequested,
        aggregateId: 'u2',
        payload: {
          userId: 'u2',
          email: 'new@bazaar.test',
          preferredLocale: Locale.En,
          link: 'https://bazaar.test/en/reset-password?token=x',
        },
      }),
    );
    await new PipelineHandler(EventType.OrderConfirmed, store, reactions).handle(
      EventFactory.create({
        type: EventType.OrderConfirmed,
        aggregateId: 'o1',
        payload: { orderId: 'o1', shopperId: 'u2' },
      }),
    );

    await new PipelineHandler(EventType.EmailVerificationRequested, store, reactions).handle(
      EventFactory.create({
        type: EventType.EmailVerificationRequested,
        aggregateId: 'u2',
        payload: {
          userId: 'u2',
          email: 'verify@bazaar.test',
          preferredLocale: Locale.Vi,
          link: 'https://bazaar.test/vi/verify-email?token=y',
        },
      }),
    );

    expect(contacts.rows.get('u2')).toMatchObject({
      email: 'verify@bazaar.test',
      preferredLocale: Locale.Vi,
    });
    expect(contacts.rows.size).toBe(1);
    expect(log.entries.map((entry) => entry.topic)).toEqual([
      'identity.events',
      'order.events',
      'identity.events',
    ]);
  });
});
