import type { Server } from 'node:http';

import { EventType, UserRole } from '@bazaar/contracts';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createNotificationTestApp } from '../../../../test/fakes/notification-test-app.js';
import { bearer, InMemoryEventLogRepository } from '../../../../test/fakes/notification.fakes.js';
import { EventLogRepository } from '../repositories/event-log.repository.js';

import { AdminEventsController } from './admin-events.controller.js';

describe('AdminEventsController (HTTP)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const log = new InMemoryEventLogRepository();
    const entry = (eventId: string, type: EventType, aggregateId: string, minute: number) => ({
      eventId,
      type,
      topic: 'order.events',
      aggregateId,
      occurredAt: new Date(Date.UTC(2026, 9, 11, 8, minute)),
      payload: { orderId: aggregateId },
    });
    log.entries.push(
      entry('e1', EventType.OrderCreated, 'o1', 0),
      entry('e2', EventType.OrderConfirmed, 'o1', 1),
      entry('e3', EventType.OrderCreated, 'o2', 2),
    );
    app = await createNotificationTestApp(
      [AdminEventsController],
      [{ provide: EventLogRepository, useValue: log }],
    );
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer() as Server);
  const admin = bearer(UserRole.Admin, 'admin');

  it('lists events newest first and filters by type or aggregate', async () => {
    const all = await http().get('/api/v1/admin/events').set('authorization', admin).expect(200);
    expect(all.body.items.map((item: { eventId: string }) => item.eventId)).toEqual([
      'e3',
      'e2',
      'e1',
    ]);

    const created = await http()
      .get('/api/v1/admin/events?type=OrderCreated')
      .set('authorization', admin)
      .expect(200);
    expect(created.body.total).toBe(2);
    const order = await http()
      .get('/api/v1/admin/events?aggregateId=o1')
      .set('authorization', admin)
      .expect(200);
    expect(order.body.items.map((item: { type: string }) => item.type)).toEqual([
      'OrderConfirmed',
      'OrderCreated',
    ]);
    expect(order.body.items[0].occurredAt).toBe('2026-10-11T08:01:00.000Z');
  });

  it('is for admins only', async () => {
    await http()
      .get('/api/v1/admin/events')
      .set('authorization', bearer(UserRole.Seller, 's'))
      .expect(403);
    await http().get('/api/v1/admin/events?type=Nope').set('authorization', admin).expect(400);
  });
});
