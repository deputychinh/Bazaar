import type { Server } from 'node:http';

import { NotificationKind, UserRole } from '@bazaar/contracts';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createNotificationTestApp } from '../../../../test/fakes/notification-test-app.js';
import {
  bearer,
  InMemoryNotificationsRepository,
} from '../../../../test/fakes/notification.fakes.js';
import { NotificationsRepository } from '../repositories/notifications.repository.js';

import { NotificationsController } from './notifications.controller.js';

describe('NotificationsController (HTTP)', () => {
  let app: INestApplication;
  let repository: InMemoryNotificationsRepository;
  const linh = bearer(UserRole.Shopper, 'linh');

  beforeEach(async () => {
    repository = new InMemoryNotificationsRepository();
    for (const kind of [NotificationKind.OrderConfirmed, NotificationKind.SellerOrderShipped]) {
      await repository.create({
        userId: 'linh',
        kind,
        data: { orderId: 'o1', orderReference: 'O1' },
      });
    }
    await repository.create({
      userId: 'tom',
      kind: NotificationKind.OrderCancelled,
      data: { orderId: 'o2', orderReference: 'O2' },
    });
    app = await createNotificationTestApp(
      [NotificationsController],
      [{ provide: NotificationsRepository, useValue: repository }],
    );
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer() as Server);

  it('lists the user’s own notifications, newest first, with the unread count', async () => {
    const response = await http()
      .get('/api/v1/notifications')
      .set('authorization', linh)
      .expect(200);
    expect(response.body).toMatchObject({ total: 2, unread: 2, page: 1, pageSize: 20 });
    expect(response.body.items.map((item: { kind: string }) => item.kind)).toEqual([
      NotificationKind.SellerOrderShipped,
      NotificationKind.OrderConfirmed,
    ]);
    await http().get('/api/v1/notifications').expect(401);
  });

  it('marks one or all as read, never someone else’s', async () => {
    const tomsId = repository.rows[2]?.id ?? '';
    await http()
      .post(`/api/v1/notifications/${tomsId}/read`)
      .set('authorization', linh)
      .expect(404);

    await http()
      .post(`/api/v1/notifications/${repository.rows[0]?.id}/read`)
      .set('authorization', linh)
      .expect(204);
    expect((await http().get('/api/v1/notifications').set('authorization', linh)).body.unread).toBe(
      1,
    );

    await http().post('/api/v1/notifications/read-all').set('authorization', linh).expect(204);
    expect((await http().get('/api/v1/notifications').set('authorization', linh)).body.unread).toBe(
      0,
    );
    expect(repository.rows[2]?.readAt).toBeNull();
  });
});
