import { Global, Module } from '@nestjs/common';

import { FakePaymentProvider } from './providers/fake-payment-provider.js';
import { PaymentProvider } from './providers/payment-provider.js';

/** The local build always uses the fake provider (plan §2B); production would bind a real one. */
@Global()
@Module({
  providers: [{ provide: PaymentProvider, useClass: FakePaymentProvider }],
  exports: [PaymentProvider],
})
export class PaymentsModule {}
