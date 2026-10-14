import {
  CancelReason,
  EventFactory,
  EventType,
  OrderStatus,
  PaymentStatus,
  SellerOrderStatus,
} from '@bazaar/contracts';
import { PromiseUtil, TraceContext } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import { PAYMENT_CHARGE_TIMEOUT_MS } from '../../../constants/payment.constant.js';
import type { Order } from '../../../interfaces/order.interface.js';
import type { ChargeResult } from '../../../interfaces/payment.interface.js';
import { OrdersRepository } from '../../orders/repositories/orders.repository.js';
import { EventOutbox } from '../../outbox/event-outbox.js';
import { PaymentProvider } from '../../payments/providers/payment-provider.js';

import { OrderSagaService } from './order-saga.service.js';

/**
 * Charges a RESERVED order and records the outcome. The charge happens outside any database
 * transaction and carries the order id as reference, so running this twice (saga + retry job)
 * charges once; the conditional transitions decide which writer records it.
 */
@Injectable()
export class PaymentSettlementService {
  public constructor(
    private readonly orders: OrdersRepository,
    private readonly payments: PaymentProvider,
    private readonly transactions: TransactionManager,
    private readonly outbox: EventOutbox,
    private readonly saga: OrderSagaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PaymentSettlementService.name);
  }

  /** The payment step of the saga, as its own span (the provider call is the slow part). */
  public async settle(orderId: string): Promise<void> {
    await TraceContext.inSpan('saga.settle-payment', () => this.settleNow(orderId), {
      attributes: { 'order.id': orderId },
    });
  }

  private async settleNow(orderId: string): Promise<void> {
    const order = await this.orders.findById(orderId);
    if (order?.status !== OrderStatus.Reserved || order.payment === null) return;

    const result = await this.charge(order);
    await this.transactions.run(async (transaction) => {
      if (!result.succeeded) {
        await this.saga.cancel(
          order,
          { reason: CancelReason.PaymentFailed, failureReason: result.failureReason },
          transaction,
        );
        return;
      }
      const paid = await this.orders.transition(
        {
          orderId,
          to: OrderStatus.Paid,
          payment: { status: PaymentStatus.Succeeded, providerRef: result.providerRef },
        },
        transaction,
      );
      if (!paid) {
        // Cancelled (timeout) while the provider was answering: the money must go back.
        await this.orders.updatePayment(
          orderId,
          { status: PaymentStatus.RefundPending, providerRef: result.providerRef },
          transaction,
        );
        return;
      }
      await this.outbox.add(
        EventFactory.create({
          type: EventType.OrderPaid,
          aggregateId: orderId,
          payload: {
            orderId,
            shopperId: order.shopperId,
            paymentId: order.payment?.id ?? '',
            amountUsdCents: order.totalUsdCents,
          },
        }),
        transaction,
      );
      await this.orders.transition(
        { orderId, to: OrderStatus.Confirmed, sellerOrders: { to: SellerOrderStatus.Confirmed } },
        transaction,
      );
      await this.outbox.add(
        EventFactory.create({
          type: EventType.OrderConfirmed,
          aggregateId: orderId,
          payload: { orderId, shopperId: order.shopperId },
        }),
        transaction,
      );
    });
  }

  /** A provider that does not answer in time counts as a failed charge. */
  private async charge(order: Order): Promise<ChargeResult> {
    try {
      return await PromiseUtil.withTimeout(
        this.payments.charge({
          token: order.payment?.providerToken ?? '',
          amountUsdCents: order.totalUsdCents,
          reference: order.id,
        }),
        PAYMENT_CHARGE_TIMEOUT_MS,
        'payment charge',
      );
    } catch (error) {
      this.logger.warn(
        { orderId: order.id, reason: PromiseUtil.errorMessage(error) },
        'charge failed',
      );
      return { succeeded: false, failureReason: 'provider_timeout' };
    }
  }
}
