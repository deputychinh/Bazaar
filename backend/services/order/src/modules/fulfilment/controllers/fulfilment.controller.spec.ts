import type { Server } from 'node:http';

import { ErrorCode, OrderStatus, SellerOrderStatus, UserRole } from '@bazaar/contracts';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createOrderTestApp } from '../../../../test/fakes/order-test-app.js';
import {
  bearer,
  ImmediateTransactionManager,
  InMemoryOrdersRepository,
  pricedLine,
  RecordingOutbox,
} from '../../../../test/fakes/order.fakes.js';
import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import { OrdersRepository } from '../../orders/repositories/orders.repository.js';
import { CheckoutService } from '../../orders/services/checkout.service.js';
import { EventOutbox } from '../../outbox/event-outbox.js';
import { FakePaymentProvider } from '../../payments/providers/fake-payment-provider.js';
import { OrderSagaService } from '../../saga/services/order-saga.service.js';
import { FulfilmentService } from '../services/fulfilment.service.js';
import { OrderQueryService } from '../services/order-query.service.js';

import { OrdersController } from './orders.controller.js';
import { SellerOrdersController } from './seller-orders.controller.js';

describe('orders and seller orders (HTTP)', () => {
  let app: INestApplication;
  let orders: InMemoryOrdersRepository;
  let orderId: string;
  let sellerOrderId: string;

  beforeEach(async () => {
    orders = new InMemoryOrdersRepository();
    const outbox = new RecordingOutbox();
    const { order } = await new CheckoutService(
      orders,
      new FakePaymentProvider(),
      new ImmediateTransactionManager(),
      outbox,
    ).checkout('shopper-1', {
      idempotencyKey: 'http-0000001',
      card: { number: '4242424242424242' },
      lines: [pricedLine()],
    });
    orderId = order.id;
    sellerOrderId = order.sellerOrders[0]?.id ?? '';
    app = await createOrderTestApp(
      [OrdersController, SellerOrdersController],
      [
        OrderQueryService,
        FulfilmentService,
        OrderSagaService,
        { provide: OrdersRepository, useValue: orders },
        { provide: TransactionManager, useClass: ImmediateTransactionManager },
        { provide: EventOutbox, useValue: outbox },
      ],
    );
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer() as Server);
  /** What the saga would have done after a successful payment. */
  const confirm = (): void => {
    orders.force(orderId, OrderStatus.Confirmed);
    orders.rows[0]!.sellerOrders[0]!.status = SellerOrderStatus.Confirmed;
  };

  it('shows shoppers their own orders only', async () => {
    const page = await http()
      .get('/api/v1/orders')
      .set('authorization', bearer(UserRole.Shopper, 'shopper-1'))
      .expect(200);
    expect(page.body).toMatchObject({ total: 1, page: 1, pageSize: 20, items: [{ id: orderId }] });

    await http()
      .get(`/api/v1/orders/${orderId}`)
      .set('authorization', bearer(UserRole.Shopper, 'shopper-1'))
      .expect(200);
    const foreign = await http()
      .get(`/api/v1/orders/${orderId}`)
      .set('authorization', bearer(UserRole.Shopper, 'other'))
      .expect(404);
    expect(foreign.body.code).toBe(ErrorCode.NotFound);
  });

  it('lets the seller ship once the order is confirmed; other roles are refused', async () => {
    const sellerAuth = bearer(UserRole.Seller, 'seller-1');
    expect(
      (await http().get('/api/v1/seller/orders').set('authorization', sellerAuth).expect(200)).body
        .total,
    ).toBe(0);
    await http()
      .post(`/api/v1/seller/orders/${sellerOrderId}/ship`)
      .set('authorization', sellerAuth)
      .expect(409);

    confirm();
    const shipped = await http()
      .post(`/api/v1/seller/orders/${sellerOrderId}/ship`)
      .set('authorization', sellerAuth)
      .expect(200);
    expect(shipped.body).toMatchObject({ id: sellerOrderId, status: 'SHIPPED' });
    expect(
      (
        await http()
          .get('/api/v1/seller/orders?status=SHIPPED')
          .set('authorization', sellerAuth)
          .expect(200)
      ).body.total,
    ).toBe(1);

    await http()
      .get('/api/v1/seller/orders')
      .set('authorization', bearer(UserRole.Shopper, 'shopper-1'))
      .expect(403);
  });

  it('lets the shopper cancel a confirmed part', async () => {
    confirm();
    const response = await http()
      .post(`/api/v1/orders/${orderId}/seller-orders/${sellerOrderId}/cancel`)
      .set('authorization', bearer(UserRole.Shopper, 'shopper-1'))
      .expect(200);
    expect(response.body.status).toBe('CANCELLED');
  });
});
