import {
  CancelReason,
  EventFactory,
  EventType,
  OrderStatus,
  PaymentStatus,
  SellerOrderStatus,
} from '@bazaar/contracts';
import { Clock } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import type { Order } from '../../../interfaces/order.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { OrdersRepository } from '../../orders/repositories/orders.repository.js';
import { CheckoutService } from '../../orders/services/checkout.service.js';
import { EventOutbox } from '../../outbox/event-outbox.js';

/** The order service's reactions in the saga (plan §5.3); every move is conditional. */
@Injectable()
export class OrderSagaService {
  public constructor(
    private readonly orders: OrdersRepository,
    private readonly outbox: EventOutbox,
    private readonly clock: Clock,
  ) {}

  /** StockReserved → RESERVED. False when the order was cancelled meanwhile (e.g. timeout). */
  public markReserved(orderId: string, transaction: Transaction): Promise<boolean> {
    return this.orders.transition({ orderId, to: OrderStatus.Reserved }, transaction);
  }

  /**
   * Cancels the whole order: seller orders too, the payment marked (failed, or refund pending if
   * money was taken), and OrderCancelled so the catalog gives the stock back.
   */
  public async cancel(
    order: Order,
    options: { reason: CancelReason; failureReason?: string },
    transaction: Transaction,
  ): Promise<boolean> {
    const charged = order.payment?.status === PaymentStatus.Succeeded;
    const moved = await this.orders.transition(
      {
        orderId: order.id,
        to: OrderStatus.Cancelled,
        cancelReason: options.reason,
        sellerOrders: {
          to: SellerOrderStatus.Cancelled,
          cancelReason: options.reason,
          at: this.clock.now(),
        },
        payment: charged
          ? { status: PaymentStatus.RefundPending }
          : {
              status: PaymentStatus.Failed,
              failureReason: options.failureReason ?? options.reason.toLowerCase(),
            },
      },
      transaction,
    );
    if (!moved) return false;
    await this.outbox.add(
      EventFactory.create({
        type: EventType.OrderCancelled,
        aggregateId: order.id,
        payload: {
          orderId: order.id,
          shopperId: order.shopperId,
          reason: options.reason,
          lines: CheckoutService.lines(order),
        },
      }),
      transaction,
    );
    return true;
  }

  /** StockRejected → CANCELLED(OUT_OF_STOCK); nothing was charged or reserved. */
  public async rejectForStock(orderId: string, transaction: Transaction): Promise<void> {
    const order = await this.orders.findById(orderId, transaction);
    if (order === null) return;
    await this.cancel(
      order,
      { reason: CancelReason.OutOfStock, failureReason: 'not_charged' },
      transaction,
    );
  }
}
