import type { Server } from 'node:http';

import { ErrorCode, UserRole } from '@bazaar/contracts';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createOrderTestApp } from '../../../../test/fakes/order-test-app.js';
import {
  bearer,
  ImmediateTransactionManager,
  InMemoryOrdersRepository,
  pricedLine,
  RecordingOutbox,
  TEST_INTERNAL_KEY,
} from '../../../../test/fakes/order.fakes.js';
import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import { EventOutbox } from '../../outbox/event-outbox.js';
import { FakePaymentProvider } from '../../payments/providers/fake-payment-provider.js';
import { PaymentProvider } from '../../payments/providers/payment-provider.js';
import { OrdersRepository } from '../repositories/orders.repository.js';
import { CheckoutService } from '../services/checkout.service.js';

import { InternalOrdersController } from './internal-orders.controller.js';

describe('InternalOrdersController (HTTP)', () => {
  let app: INestApplication;
  const body = {
    idempotencyKey: 'checkout-0001',
    card: { number: '4242424242424242' },
    lines: [pricedLine()],
  };

  beforeEach(async () => {
    app = await createOrderTestApp(
      [InternalOrdersController],
      [
        CheckoutService,
        { provide: OrdersRepository, useValue: new InMemoryOrdersRepository() },
        { provide: PaymentProvider, useClass: FakePaymentProvider },
        { provide: TransactionManager, useClass: ImmediateTransactionManager },
        { provide: EventOutbox, useClass: RecordingOutbox },
      ],
    );
  });

  afterEach(async () => {
    await app.close();
  });

  const post = (headers: Record<string, string>): request.Test =>
    request(app.getHttpServer() as Server)
      .post('/api/v1/internal/orders')
      .set(headers)
      .send(body);

  it('creates the order for the token holder (201), replays with 200', async () => {
    const headers = {
      'x-internal-key': TEST_INTERNAL_KEY,
      authorization: bearer(UserRole.Shopper, 'shopper-1'),
    };

    const created = await post(headers).expect(201);
    expect(created.body).toMatchObject({
      status: 'PENDING',
      totalUsdCents: 1500,
      payment: { cardLast4: '4242' },
    });
    expect(created.body.payment).not.toHaveProperty('providerToken');

    const replay = await post(headers).expect(200);
    expect(replay.body.id).toBe(created.body.id);
  });

  it('needs both the internal key and a shopper token', async () => {
    expect(
      (await post({ authorization: bearer(UserRole.Shopper, 's') }).expect(403)).body.code,
    ).toBe(ErrorCode.Forbidden);
    await post({ 'x-internal-key': TEST_INTERNAL_KEY }).expect(401);
  });

  it('reports an invalid card as a validation problem', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/api/v1/internal/orders')
      .set({
        'x-internal-key': TEST_INTERNAL_KEY,
        authorization: bearer(UserRole.Shopper, 'shopper-1'),
      })
      .send({ ...body, card: { number: '4242424242424241' } })
      .expect(400);
    expect(response.body.details).toEqual({ fields: { 'card.number': 'invalid' } });
  });
});
