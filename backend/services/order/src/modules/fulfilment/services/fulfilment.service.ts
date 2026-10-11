import {
  CancelReason,
  EventFactory,
  EventType,
  OrderStatus,
  PaymentStatus,
  SellerOrderStatus,
} from '@bazaar/contracts';
import { Clock, NotFoundError } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import type { Order, SellerOrder } from '../../../interfaces/order.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { OrderStateMachine } from '../../orders/domain/order-state-machine.js';
import { InvalidOrderTransitionError } from '../../orders/errors/invalid-order-transition.error.js';
import { OrdersRepository } from '../../orders/repositories/orders.repository.js';
import { CheckoutService } from '../../orders/services/checkout.service.js';
import { EventOutbox } from '../../outbox/event-outbox.js';
import { OrderSagaService } from '../../saga/services/order-saga.service.js';

/**
 * After confirmation each seller fulfils their part (plan §2B): CONFIRMED → SHIPPED → DELIVERED;
 * the shopper may cancel a part before it ships. When every part is final the order completes —
 * or is cancelled, if the shopper cancelled every part.
 */
@Injectable()
export class FulfilmentService {
  public constructor(
    private readonly orders: OrdersRepository,
    private readonly transactions: TransactionManager,
    private readonly outbox: EventOutbox,
    private readonly saga: OrderSagaService,
    private readonly clock: Clock,
  ) {}

  public ship(sellerId: string, sellerOrderId: string): Promise<Order> {
    return this.move({
      sellerOrderId,
      to: SellerOrderStatus.Shipped,
      allowed: (part) => part.sellerId === sellerId,
    });
  }

  public deliver(sellerId: string, sellerOrderId: string): Promise<Order> {
    return this.move({
      sellerOrderId,
      to: SellerOrderStatus.Delivered,
      allowed: (part) => part.sellerId === sellerId,
    });
  }

  public cancelByShopper(
    shopperId: string,
    orderId: string,
    sellerOrderId: string,
  ): Promise<Order> {
    return this.move({
      sellerOrderId,
      to: SellerOrderStatus.Cancelled,
      allowed: (_part, order) => order.shopperId === shopperId && order.id === orderId,
    });
  }

  private async move(options: {
    sellerOrderId: string;
    to: SellerOrderStatus;
    allowed: (part: SellerOrder, order: Order) => boolean;
  }): Promise<Order> {
    const order = await this.orders.findBySellerOrderId(options.sellerOrderId);
    const part = order?.sellerOrders.find((candidate) => candidate.id === options.sellerOrderId);
    // Someone else's order looks exactly like a missing one (no id probing).
    if (order === null || part === undefined || !options.allowed(part, order)) {
      throw new NotFoundError('Seller order', options.sellerOrderId);
    }
    // Before confirmation the parts belong to the saga, not to sellers or shoppers.
    if (order.status !== OrderStatus.Confirmed) {
      throw new InvalidOrderTransitionError('The order is not confirmed yet', {
        status: order.status,
      });
    }
    OrderStateMachine.assertSeller(part.status, options.to);

    await this.transactions.run(async (transaction) => {
      const moved = await this.orders.transitionSellerOrder(
        {
          sellerOrderId: part.id,
          to: options.to,
          at: this.clock.now(),
          ...(options.to === SellerOrderStatus.Cancelled && {
            cancelReason: CancelReason.ShopperCancelled,
          }),
        },
        transaction,
      );
      if (!moved) {
        throw new InvalidOrderTransitionError('The seller order changed meanwhile, reload it', {});
      }
      await this.announce({ order, part, to: options.to }, transaction);
      await this.completeIfFinished(order.id, transaction);
    });
    return (await this.orders.findById(order.id)) ?? order;
  }

  private async announce(
    { order, part, to }: { order: Order; part: SellerOrder; to: SellerOrderStatus },
    transaction: Transaction,
  ): Promise<void> {
    const reference = {
      orderId: order.id,
      sellerOrderId: part.id,
      sellerId: part.sellerId,
      shopperId: order.shopperId,
    };
    if (to === SellerOrderStatus.Shipped) {
      await this.outbox.add(
        EventFactory.create({
          type: EventType.SellerOrderShipped,
          aggregateId: order.id,
          payload: reference,
        }),
        transaction,
      );
    } else if (to === SellerOrderStatus.Delivered) {
      await this.outbox.add(
        EventFactory.create({
          type: EventType.SellerOrderDelivered,
          aggregateId: order.id,
          payload: {
            ...reference,
            productIds: [...new Set(part.items.map((item) => item.productId))],
          },
        }),
        transaction,
      );
    } else {
      // Paid money for this part is owed back; the catalog releases its stock.
      if (order.payment?.status === PaymentStatus.Succeeded) {
        await this.orders.updatePayment(
          order.id,
          { status: PaymentStatus.RefundPending },
          transaction,
        );
      }
      await this.outbox.add(
        EventFactory.create({
          type: EventType.SellerOrderCancelled,
          aggregateId: order.id,
          payload: {
            ...reference,
            reason: CancelReason.ShopperCancelled,
            lines: CheckoutService.lines({ ...order, sellerOrders: [part] }),
          },
        }),
        transaction,
      );
    }
  }

  private async completeIfFinished(orderId: string, transaction: Transaction): Promise<void> {
    const order = await this.orders.findById(orderId, transaction);
    if (
      order === null ||
      !order.sellerOrders.every((part) => OrderStateMachine.isFinal(part.status))
    )
      return;
    if (order.sellerOrders.every((part) => part.status === SellerOrderStatus.Cancelled)) {
      await this.saga.cancel(order, { reason: CancelReason.ShopperCancelled }, transaction);
      return;
    }
    if (await this.orders.transition({ orderId, to: OrderStatus.Completed }, transaction)) {
      await this.outbox.add(
        EventFactory.create({
          type: EventType.OrderCompleted,
          aggregateId: orderId,
          payload: { orderId, shopperId: order.shopperId },
        }),
        transaction,
      );
    }
  }
}
