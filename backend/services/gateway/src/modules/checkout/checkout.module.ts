import { Module } from '@nestjs/common';

import { HttpInternalServices } from './clients/http-internal-services.js';
import { InternalServices } from './clients/internal-services.js';
import { CheckoutController } from './controllers/checkout.controller.js';
import { CheckoutService } from './services/checkout.service.js';

@Module({
  controllers: [CheckoutController],
  providers: [CheckoutService, { provide: InternalServices, useClass: HttpInternalServices }],
})
export class CheckoutModule {}
