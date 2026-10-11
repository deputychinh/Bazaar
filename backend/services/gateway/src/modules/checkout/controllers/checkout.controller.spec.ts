import type { Server } from 'node:http';

import { ErrorCode, UserRole } from '@bazaar/contracts';
import {
  AccessTokenGuard,
  AppLoggerModule,
  HttpCommonModule,
  LogLevel,
  TokenVerifier,
} from '@bazaar/nest-common';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { FakeInternalServices, outOfStock } from '../../../../test/fakes/checkout.fakes.js';
import { API_PREFIX } from '../../../constants/gateway.constant.js';
import { InternalServices } from '../clients/internal-services.js';
import { CheckoutService } from '../services/checkout.service.js';

import { CheckoutController } from './checkout.controller.js';

class AnyTokenVerifier extends TokenVerifier {
  public verify(): Promise<{ id: string; email: string; role: UserRole }> {
    return Promise.resolve({ id: 'shopper-1', email: 's@bazaar.test', role: UserRole.Shopper });
  }
}

describe('CheckoutController (HTTP)', () => {
  let app: INestApplication;
  let services: FakeInternalServices;
  const body = {
    lines: [{ productSlug: 'silk-lantern', variantSku: 'LAN-RED', quantity: 1 }],
    card: { number: '4242424242424242' },
  };

  beforeEach(async () => {
    services = new FakeInternalServices();
    const moduleRef = await Test.createTestingModule({
      imports: [
        AppLoggerModule.forRoot({ serviceName: 'test', level: LogLevel.Silent, pretty: false }),
        HttpCommonModule,
      ],
      controllers: [CheckoutController],
      providers: [
        CheckoutService,
        { provide: InternalServices, useValue: services },
        { provide: TokenVerifier, useClass: AnyTokenVerifier },
        { provide: APP_GUARD, useClass: AccessTokenGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const post = (): request.Test =>
    request(app.getHttpServer() as Server)
      .post('/api/v1/orders')
      .set('authorization', 'Bearer t')
      .send(body);

  it('places the order (201) and replays it (200)', async () => {
    await post().set('Idempotency-Key', 'checkout-0001').expect(201);
    services.created = false;
    await post().set('Idempotency-Key', 'checkout-0001').expect(200);
  });

  it('requires a well-formed Idempotency-Key and a signed-in shopper', async () => {
    const missing = await post().expect(400);
    expect(missing.body.details.fields).toHaveProperty('Idempotency-Key');
    await post().set('Idempotency-Key', 'short').expect(400);
    await request(app.getHttpServer() as Server)
      .post('/api/v1/orders')
      .send(body)
      .expect(401);
  });

  it('answers 409 CART_CHANGED with the lines to fix', async () => {
    services.answer = [outOfStock()];
    const response = await post().set('Idempotency-Key', 'checkout-0002').expect(409);
    expect(response.body).toMatchObject({
      code: ErrorCode.CartChanged,
      details: { lines: [outOfStock()] },
    });
  });
});
